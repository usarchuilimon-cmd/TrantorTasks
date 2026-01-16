import React, { useEffect, useRef, useState, useContext } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Type, FunctionDeclaration } from '@google/genai';
import { AppContext } from '../App';
import { floatTo16BitPCM, arrayBufferToBase64, base64ToUint8Array, decodeAudioData, downsampleTo16k } from '../services/audioUtils';
import { TRANSLATIONS, getLocale } from '../constants';
import { Priority, Status, Currency } from '../types';

const SAMPLE_RATE_OUTPUT = 24000;

export const VoiceAssistant: React.FC = () => {
    const { addTask, tasks, language, addLog } = useContext(AppContext);
    const [isActive, setIsActive] = useState(false);
    const [isThinking, setIsThinking] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false); // Feedback for connection lag
    const [audioLevel, setAudioLevel] = useState(0); // 0 to 1 scaling factor
    const [isGated, setIsGated] = useState(false); // Visual feedback for noise gate
    
    // Sensitivity State: 0 (Strict/High Threshold) to 1 (Sensitive/Low Threshold)
    // Default to 0.4 for noisy environments
    const [sensitivity, setSensitivity] = useState(0.4); 
    const sensitivityRef = useRef(0.4); 
    const lastUiUpdateRef = useRef(0); // Throttle UI updates

    // Sync ref with state
    useEffect(() => {
        sensitivityRef.current = sensitivity;
    }, [sensitivity]);
    
    // Refs for audio handling
    const audioContextRef = useRef<AudioContext | null>(null);
    const inputSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const processorRef = useRef<ScriptProcessorNode | null>(null);
    const outputContextRef = useRef<AudioContext | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const nextStartTimeRef = useRef<number>(0);
    const sessionRef = useRef<any>(null);
    const wakeLockRef = useRef<any>(null);
    
    // DSP State Refs - Cascaded filters for steeper slope
    const hpfState1 = useRef({ in: 0, out: 0 }); 
    const hpfState2 = useRef({ in: 0, out: 0 }); 
    const lpfState = useRef({ out: 0 });
    
    const hpfAlphaRef = useRef(0.95); 
    const lpfAlphaRef = useRef(0.5); 
    const gateHoldCounter = useRef(0); 
    
    // Prevent duplicate executions
    const processedToolCallIds = useRef<Set<string>>(new Set());

    const t = TRANSLATIONS[language];

    // Tool Definitions
    const addTaskTool: FunctionDeclaration = {
        name: 'addTask',
        description: 'Add a new task. Differentiate between title, description, priority, due date, and estimated duration.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                title: { 
                    type: Type.STRING, 
                    description: 'The main subject of the task. Keep it brief (e.g. "Buy Groceries", "Email Client").' 
                },
                description: { 
                    type: Type.STRING, 
                    description: 'Detailed instructions, context, or notes provided by the user. If the user provides a long sentence, extract the details here (e.g. "from the store on Main St").' 
                },
                priority: { 
                    type: Type.STRING, 
                    enum: Object.values(Priority), 
                    description: 'Priority level of the task.' 
                },
                dueDate: { 
                    type: Type.STRING, 
                    description: 'Due date in YYYY-MM-DD format.' 
                }
            },
            required: ['title']
        }
    };

    const listTasksTool: FunctionDeclaration = {
        name: 'listTasks',
        description: 'List or read the current pending tasks.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                status: { type: Type.STRING, enum: Object.values(Status), description: 'Filter by status' }
            }
        }
    };

    const releaseWakeLock = async () => {
        if (wakeLockRef.current) {
            try {
                await wakeLockRef.current.release();
                wakeLockRef.current = null;
            } catch (err) {
                console.debug('Wake Lock release failed', err);
            }
        }
    };

    const stopSession = async () => {
        addLog('info', 'VoiceAI', 'Stopping voice session...');
        setAudioLevel(0);
        setIsGated(false);
        setIsConnecting(false);
        
        // 1. Release Wake Lock
        await releaseWakeLock();

        // 2. Stop Script Processor (Data processing)
        if (processorRef.current) {
            processorRef.current.disconnect();
            processorRef.current.onaudioprocess = null; 
            processorRef.current = null;
        }

        // 3. Stop Input Source (Microphone Node)
        if (inputSourceRef.current) {
            inputSourceRef.current.disconnect();
            inputSourceRef.current = null;
        }

        // 4. Stop Media Stream (Hardware Microphone)
        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(track => {
                track.stop();
            });
            mediaStreamRef.current = null;
        }

        // 5. Close Audio Contexts
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            await audioContextRef.current.close();
            audioContextRef.current = null;
        }
        if (outputContextRef.current && outputContextRef.current.state !== 'closed') {
            await outputContextRef.current.close();
            outputContextRef.current = null;
        }

        // 6. Clean Session Ref
        if (sessionRef.current) {
            sessionRef.current = null;
        }

        setIsActive(false);
        setIsThinking(false);
        addLog('info', 'VoiceAI', 'Session stopped');
    };

    /**
     * IIR High-Pass Filter
     * Removes low-frequency rumble (engine noise, wind) below ~80Hz.
     */
    const applyHighPassFilter = (data: Float32Array, prev: { in: number, out: number }, alpha: number) => {
        for (let i = 0; i < data.length; i++) {
            const currentIn = data[i];
            const currentOut = alpha * (prev.out + currentIn - prev.in);
            data[i] = currentOut; 
            prev.in = currentIn;
            prev.out = currentOut;
        }
    };

    /**
     * IIR Low-Pass Filter
     * Removes high-frequency hiss/noise above ~4kHz.
     */
    const applyLowPassFilter = (data: Float32Array, prev: { out: number }, alpha: number) => {
        for (let i = 0; i < data.length; i++) {
            const currentIn = data[i];
            const currentOut = prev.out + alpha * (currentIn - prev.out);
            data[i] = currentOut; 
            prev.out = currentOut;
        }
    };

    const startSession = async () => {
        const apiKey = typeof process !== 'undefined' && process.env ? process.env.API_KEY : '';
        if (!apiKey) {
            console.error("API Key not found");
            addLog('error', 'VoiceAI', 'API Key missing');
            alert(t.apiKeyMissing);
            return;
        }

        // Ensure previous session is fully cleaned
        await stopSession();
        
        // Reset processed IDs on new session
        processedToolCallIds.current.clear();
        
        // Reset DSP state
        hpfState1.current = { in: 0, out: 0 };
        hpfState2.current = { in: 0, out: 0 };
        lpfState.current = { out: 0 };
        gateHoldCounter.current = 0;

        setIsActive(true);
        setIsConnecting(true); // Show loading state immediately
        setIsThinking(false);
        addLog('info', 'VoiceAI', 'Starting new session...');

        try {
            // Request Wake Lock for Mobile
            if ('wakeLock' in navigator) {
                try {
                    wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
                } catch (err) {
                    console.debug('Wake Lock request failed', err);
                }
            }

            const ai = new GoogleGenAI({ apiKey });
            
            // Output Audio Context 
            outputContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            if (outputContextRef.current.state === 'suspended') {
                await outputContextRef.current.resume();
            }
            nextStartTimeRef.current = outputContextRef.current.currentTime;

            // Input Audio Context 
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            if (audioContextRef.current.state === 'suspended') {
                await audioContextRef.current.resume();
            }
            
            // Calculate correct Alpha for Filters based on hardware sample rate
            const sr = audioContextRef.current.sampleRate;
            const dt = 1.0 / sr;

            // 85Hz HPF (Remove Rumble) - We will cascade this twice for 12dB/oct slope
            const rcHpf = 1.0 / (2.0 * Math.PI * 85);
            hpfAlphaRef.current = rcHpf / (rcHpf + dt);

            // 4000Hz LPF (Remove Hiss)
            const rcLpf = 1.0 / (2.0 * Math.PI * 4000);
            lpfAlphaRef.current = dt / (rcLpf + dt);
            
            // Get Microphone Access with Aggressive Noise Constraints
            // Enforce 'true' to prefer hardware DSP on mobile which is more efficient
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    channelCount: 1,
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    // @ts-ignore - Specific Chrome constraints
                    googEchoCancellation: true,
                    googAutoGainControl: true,
                    googNoiseSuppression: true,
                    googHighpassFilter: true
                } 
            });
            mediaStreamRef.current = stream; 
            addLog('info', 'VoiceAI', 'Microphone access granted', { tracks: stream.getAudioTracks().length, sampleRate: sr });
            
            const targetLang = language === 'es' ? 'Spanish' : 'English';
            const localeStr = getLocale(language);

            const systemInstruction = `You are TRANTOR, a professional task management assistant.
            
            CRITICAL LANGUAGE INSTRUCTION:
            The user has selected ${targetLang.toUpperCase()} as their interface language.
            YOU MUST SPEAK, LISTEN, AND THINK EXCLUSIVELY IN ${targetLang.toUpperCase()}.

            OPERATIONAL CONTEXT: 
            The user is likely in a NOISY environment (truck cabin, traffic).
            
            AUDIO HANDLING:
            1. FILTER NOISE: Expect background noise. Focus STRICTLY on the human voice commands.
            2. BE CONCISE: Transport operators need quick answers. Keep responses SHORT, DIRECT, and LOUD.
            
            DATA HANDLING:
            - When listing tasks, read dates in a natural, spoken format for ${targetLang}.
            - Do not read IDs or technical fields unless asked.

            TOOL CONFIRMATION PROTOCOL:
            - Before executing the 'addTask' tool, summarize details and ask for confirmation.
            `;

            // Connect to Gemini Live - Using latest stable 12-2025 model
            const sessionPromise = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-12-2025',
                config: {
                    systemInstruction: systemInstruction,
                    tools: [{ functionDeclarations: [addTaskTool, listTasksTool] }],
                    responseModalities: [Modality.AUDIO],
                    speechConfig: {
                        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
                    }
                },
                callbacks: {
                    onopen: () => {
                        console.log("Gemini Live Connected");
                        addLog('success', 'VoiceAI', `Connected to Gemini Live (${targetLang})`);
                        setIsThinking(false);
                        setIsConnecting(false); // Connection established

                        if (!audioContextRef.current || !mediaStreamRef.current) return;
                        
                        inputSourceRef.current = audioContextRef.current.createMediaStreamSource(mediaStreamRef.current);
                        
                        // Buffer size 4096 gives better stability on mobile
                        processorRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1);
                        
                        let silenceCounter = 0;
                        const contextSampleRate = audioContextRef.current.sampleRate;
                        
                        // Hold duration in samples (approx 500ms for stability in speech pauses)
                        const GATE_HOLD_SAMPLES = Math.floor(contextSampleRate * 0.5); 

                        processorRef.current.onaudioprocess = (e) => {
                            if (!inputSourceRef.current) return;

                            let inputData = e.inputBuffer.getChannelData(0);
                            
                            // 0. DSP Pipeline
                            // Stage 1: High Pass (remove rumble)
                            applyHighPassFilter(inputData, hpfState1.current, hpfAlphaRef.current);
                            // Stage 2: High Pass (cascade for steeper slope)
                            applyHighPassFilter(inputData, hpfState2.current, hpfAlphaRef.current);
                            // Stage 3: Low Pass (remove hiss)
                            applyLowPassFilter(inputData, lpfState.current, lpfAlphaRef.current);

                            // 1. Calculate Volume Level (RMS)
                            let sum = 0;
                            // Downsample for RMS calc performance
                            const step = Math.ceil(inputData.length / 100); 
                            for (let i = 0; i < inputData.length; i += step) {
                                sum += inputData[i] * inputData[i];
                            }
                            const rms = Math.sqrt(sum / (inputData.length / step));
                            
                            // 2. Dynamic Noise Gate Logic
                            const currentSens = sensitivityRef.current;
                            
                            // Logarithmic threshold mapping for more natural control
                            // Sens 1.0 (High Sens) -> Threshold 0.001
                            // Sens 0.0 (Strict) -> Threshold 0.08
                            // Formula: base_noise + (1-sens)^2 * range
                            const gateThreshold = 0.001 + Math.pow((1 - currentSens), 2) * 0.08;
                            
                            const isSignalPresent = rms > gateThreshold;

                            if (isSignalPresent) {
                                gateHoldCounter.current = GATE_HOLD_SAMPLES;
                            } else if (gateHoldCounter.current > 0) {
                                gateHoldCounter.current -= inputData.length;
                            }

                            const gated = gateHoldCounter.current <= 0;
                            
                            // 3. UI Updates - Throttled to avoid main thread jank on mobile
                            const now = Date.now();
                            if (now - lastUiUpdateRef.current > 40) { // Limit to ~25fps
                                lastUiUpdateRef.current = now;
                                setIsGated(gated);
                                
                                if (gated) {
                                    setAudioLevel(0);
                                } else {
                                    const visualLevel = Math.min(1, (rms - gateThreshold) * 30); 
                                    setAudioLevel(visualLevel);
                                }
                            }

                            // Diagnostics
                            if (rms < 0.00001) {
                                silenceCounter++;
                                if (silenceCounter > 200 && silenceCounter % 200 === 0) {
                                     addLog('warning', 'VoiceAI', 'No audio input detected (Silence).');
                                }
                            } else {
                                silenceCounter = 0;
                            }

                            // 4. Processing & Output
                            let processData = inputData;

                            if (gated) {
                                // SEND SILENCE if below threshold to save tokens and reduce hallucinations
                                processData = new Float32Array(inputData.length).fill(0);
                            } else if (contextSampleRate !== 16000) {
                                // Standard downsampling for non-gated audio
                                processData = downsampleTo16k(inputData, contextSampleRate);
                            }

                            // 5. Prepare Data for API
                            const pcm16 = floatTo16BitPCM(processData);
                            const base64Data = arrayBufferToBase64(pcm16.buffer);
                            
                            sessionPromise.then(session => {
                                if (sessionRef.current) {
                                    session.sendRealtimeInput({
                                        media: {
                                            mimeType: 'audio/pcm;rate=16000',
                                            data: base64Data
                                        }
                                    });
                                }
                            });
                        };

                        inputSourceRef.current.connect(processorRef.current);
                        processorRef.current.connect(audioContextRef.current.destination);
                    },
                    onmessage: async (msg: LiveServerMessage) => {
                        // Handle Audio Output
                        const audioData = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                        if (audioData && outputContextRef.current && outputContextRef.current.state !== 'closed') {
                            const buffer = await decodeAudioData(
                                base64ToUint8Array(audioData),
                                outputContextRef.current,
                                SAMPLE_RATE_OUTPUT
                            );
                            
                            const source = outputContextRef.current.createBufferSource();
                            source.buffer = buffer;
                            source.connect(outputContextRef.current.destination);
                            
                            const startTime = Math.max(outputContextRef.current.currentTime, nextStartTimeRef.current);
                            source.start(startTime);
                            nextStartTimeRef.current = startTime + buffer.duration;
                        }

                        // Handle Tool Calls
                        if (msg.toolCall) {
                            sessionPromise.then(async session => {
                                for (const fc of msg.toolCall!.functionCalls) {
                                    
                                    if (processedToolCallIds.current.has(fc.id)) continue; 
                                    
                                    addLog('info', 'VoiceAI', `Processing Tool: ${fc.name}`, fc.args);
                                    processedToolCallIds.current.add(fc.id);

                                    let result: any = { success: true };
                                    
                                    if (fc.name === 'addTask') {
                                        const { title, description, priority, dueDate } = fc.args as any;
                                        addTask({
                                            title,
                                            description: description || '',
                                            priority: priority || Priority.MEDIUM,
                                            dueDate: dueDate || new Date().toISOString().split('T')[0],
                                            status: Status.NOT_STARTED,
                                            assignee: 'Me',
                                            currency: Currency.USD,
                                            estimatedCost: 0
                                        });
                                        result = { message: language === 'es' ? "Tarea agregada correctamente" : "Task added successfully" };
                                    } else if (fc.name === 'listTasks') {
                                        const pending = tasks.filter(t => t.status !== Status.COMPLETED);
                                        result = { 
                                            count: pending.length, 
                                            tasks: pending.map(t => {
                                                let humanDate = t.dueDate;
                                                try {
                                                    if(t.dueDate) {
                                                        const [y, m, d] = t.dueDate.split('-').map(Number);
                                                        const dateObj = new Date(y, m-1, d);
                                                        humanDate = dateObj.toLocaleDateString(localeStr, { weekday: 'long', month: 'long', day: 'numeric' });
                                                    }
                                                } catch(e) {}
                                                return { 
                                                    title: t.title, 
                                                    priority: t.priorityVal ? t.priorityVal[t.priority] : t.priority, 
                                                    dueDate: humanDate 
                                                };
                                            }) 
                                        };
                                    }

                                    if (sessionRef.current) {
                                        session.sendToolResponse({
                                            functionResponses: {
                                                name: fc.name,
                                                id: fc.id,
                                                response: { result }
                                            }
                                        });
                                    }
                                }
                            });
                        }
                    },
                    onclose: () => {
                        console.log("Gemini Live Closed");
                        addLog('warning', 'VoiceAI', 'Connection closed by server');
                        if (isActive) stopSession();
                    },
                    onerror: (err) => {
                        console.error("Gemini Live Error", err);
                        addLog('error', 'VoiceAI', 'Connection Error', err);
                        stopSession();
                    }
                }
            });
            
            sessionRef.current = sessionPromise;

        } catch (error: any) {
            console.error("Failed to start voice session", error);
            addLog('error', 'VoiceAI', 'Failed to initialize session', error.message);
            stopSession();
        }
    };

    // Immersive Overlay when Active
    if (isActive) {
        return (
            <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center animate-fade-in touch-none select-none overscroll-none">
                 {/* Status Text */}
                <div className="absolute top-16 text-center px-4 w-full">
                    <p className="text-white/60 text-lg font-light mb-2 uppercase tracking-widest text-xs">
                        {isConnecting 
                            ? 'Connecting...' 
                            : isThinking 
                                ? t.processing 
                                : (audioLevel > 0 ? t.listening : 'Waiting for voice...')}
                    </p>
                    <h2 className="text-white text-3xl font-bold tracking-tight">Trantor AI</h2>
                    
                    {/* Noise Gate Indicator */}
                    {!isConnecting && (
                        <div className="mt-4 flex justify-center items-center gap-2">
                            <div className={`transition-all duration-300 flex items-center gap-2 px-3 py-1 rounded-full border ${isGated ? 'bg-red-500/20 border-red-500/50 text-red-200' : 'bg-green-500/20 border-green-500/50 text-green-200'}`}>
                                <span className={`w-2 h-2 rounded-full ${isGated ? 'bg-red-500' : 'bg-green-500 animate-pulse'}`}></span>
                                <span className="text-[10px] font-bold uppercase">
                                    {isGated ? 'Noise Gated (Talk Louder)' : 'Transmitting Audio'}
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Animated Visualizer - Reacts to Audio Level */}
                <div className="relative flex items-center justify-center">
                    {/* Dynamic Rings */}
                    <div 
                        className="absolute bg-primary-500/20 rounded-full transition-all duration-100 ease-out will-change-transform"
                        style={{ width: `${12 + audioLevel * 30}rem`, height: `${12 + audioLevel * 30}rem`, opacity: 0.1 + audioLevel }}
                    ></div>
                    <div 
                        className="absolute bg-primary-500/40 rounded-full transition-all duration-75 ease-out will-change-transform"
                         style={{ width: `${10 + audioLevel * 20}rem`, height: `${10 + audioLevel * 20}rem`, opacity: 0.2 + audioLevel }}
                    ></div>
                    <div 
                        className="absolute bg-indigo-500/60 rounded-full transition-all duration-75 ease-out will-change-transform"
                         style={{ width: `${8 + audioLevel * 10}rem`, height: `${8 + audioLevel * 10}rem`, opacity: 0.4 + audioLevel }}
                    ></div>
                    
                    {/* Core Button - Massive for Mobile */}
                    <button 
                        onClick={stopSession}
                        className="relative z-10 w-32 h-32 rounded-full bg-gradient-to-t from-primary-600 to-indigo-500 shadow-[0_0_50px_rgba(79,70,229,0.5)] flex items-center justify-center transform hover:scale-105 active:scale-95 transition-transform touch-none border-4 border-white/20"
                        style={{ touchAction: 'none' }}
                    >
                        <span className="material-symbols-outlined text-white text-6xl">mic_off</span>
                        {isConnecting && (
                            <span className="absolute inset-0 rounded-full border-4 border-t-white/80 border-white/10 animate-spin"></span>
                        )}
                    </button>
                </div>

                {/* Sensitivity Control */}
                <div className="absolute bottom-32 w-full max-w-sm px-8 flex flex-col gap-4">
                    <div className="flex justify-between text-white/70 text-[10px] uppercase tracking-wider font-bold">
                        <span>Strict (Noisy Cabin)</span>
                        <span>Sensitive (Office)</span>
                    </div>
                    
                    <div className="relative w-full h-12 flex items-center touch-pan-x">
                        {/* Custom Track Background */}
                        <div className="absolute w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500" style={{ width: `${sensitivity * 100}%` }}></div>
                        </div>
                        
                        <input 
                            type="range" 
                            min="0" 
                            max="1" 
                            step="0.01" 
                            value={sensitivity} 
                            onChange={(e) => setSensitivity(parseFloat(e.target.value))}
                            className="absolute w-full h-12 opacity-0 cursor-pointer z-20"
                            aria-label="Microphone Sensitivity"
                        />
                        
                        {/* Custom Thumb */}
                        <div 
                            className="absolute h-6 w-6 bg-white rounded-full shadow-lg border-2 border-primary-500 z-10 pointer-events-none transition-all duration-75"
                            style={{ left: `calc(${sensitivity * 100}% - 12px)` }}
                        ></div>
                    </div>
                    
                    <p className="text-center text-white/40 text-[10px]">
                        Adjust slider until "Noise Gated" turns red when you stop speaking.
                    </p>
                </div>

                {/* Close/Action Hint */}
                <div className="absolute bottom-12 text-center w-full px-8">
                    <button 
                        onClick={stopSession}
                        className="w-full max-w-xs px-10 py-4 rounded-full border-2 border-white/20 text-white font-bold text-lg hover:bg-white/10 active:bg-white/20 transition-colors backdrop-blur-sm touch-none"
                    >
                        {t.close || 'Cancel'}
                    </button>
                </div>
            </div>
        );
    }

    // Default Floating Action Button
    return (
        <div className="fixed z-50 transition-all duration-300 bottom-24 left-1/2 -translate-x-1/2 md:left-auto md:translate-x-0 md:bottom-8 md:right-8">
           <button 
                onClick={startSession}
                className="group relative flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary-600 to-indigo-600 rounded-full shadow-xl shadow-primary-600/40 hover:shadow-primary-600/60 active:scale-95 transition-all duration-300 ring-4 ring-white dark:ring-gray-900 touch-none select-none"
                style={{ touchAction: 'none' }}
                aria-label={t.tapToSpeak}
           >
                {isConnecting ? (
                    <span className="material-symbols-outlined text-white text-3xl animate-spin">refresh</span>
                ) : (
                    <span className="material-symbols-outlined text-white text-3xl">mic</span>
                )}
                
                <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap hidden md:block pointer-events-none">
                    {t.tapToSpeak}
                </span>
                {!isConnecting && (
                    <span className="absolute inset-0 rounded-full border-2 border-white/30 animate-[ping_2.5s_ease-in-out_infinite] pointer-events-none"></span>
                )}
           </button>
        </div>
    );
};