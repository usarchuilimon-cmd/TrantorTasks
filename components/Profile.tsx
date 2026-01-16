import React, { useContext, useState, useEffect } from 'react';
import { AppContext } from '../App';
import { TRANSLATIONS } from '../constants';

export const Profile: React.FC = () => {
    const { user, language } = useContext(AppContext);
    const t = TRANSLATIONS[language];

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        bio: ''
    });

    useEffect(() => {
        if (user) {
            setFormData({
                name: user.name,
                email: user.email,
                bio: user.bio
            });
        }
    }, [user]);

    if (!user) return null;

    return (
        <div className="max-w-4xl mx-auto space-y-4 md:space-y-6 animate-fade-in pb-12">
            {/* Header Card */}
            <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-gray-200 dark:border-gray-700 p-6 flex flex-col sm:flex-row items-center sm:items-start gap-6 shadow-sm">
                <div className="relative">
                     <img src={user.avatar} alt={user.name} className="w-24 h-24 rounded-full border-4 border-white dark:border-gray-700 shadow-md object-cover" />
                     <button className="absolute bottom-0 right-0 bg-primary-600 text-white p-1.5 rounded-full hover:bg-primary-700 shadow-sm border-2 border-white dark:border-gray-700">
                        <span className="material-symbols-outlined text-xs">edit</span>
                     </button>
                </div>
                
                <div className="flex-1 pt-2 text-center sm:text-left">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{user.name}</h2>
                    <p className="text-gray-500 dark:text-gray-400">{user.role} - {user.department}</p>
                    <div className="flex gap-2 mt-3 justify-center sm:justify-start">
                        <span className="px-3 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 text-xs font-medium rounded-full">{t.active}</span>
                        <span className="px-3 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 text-xs font-medium rounded-full">{t.admin}</span>
                    </div>
                </div>
            </div>

            {/* Form */}
            <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-gray-200 dark:border-gray-700 p-6 md:p-8 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 border-b border-gray-100 dark:border-gray-700 pb-4">{t.personalInfo}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t.fullName}</label>
                        <input 
                            type="text" 
                            value={formData.name} 
                            onChange={(e) => setFormData({...formData, name: e.target.value})}
                            className="w-full rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white sm:text-sm focus:ring-primary-500 focus:border-primary-500" 
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t.emailLabel}</label>
                        <input 
                            type="email" 
                            value={formData.email} 
                            onChange={(e) => setFormData({...formData, email: e.target.value})}
                            className="w-full rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white sm:text-sm focus:ring-primary-500 focus:border-primary-500" 
                        />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t.bio}</label>
                        <textarea 
                            rows={4} 
                            value={formData.bio} 
                            onChange={(e) => setFormData({...formData, bio: e.target.value})}
                            className="w-full rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white sm:text-sm focus:ring-primary-500 focus:border-primary-500" 
                        />
                    </div>
                </div>
                <div className="mt-8 flex justify-end gap-3">
                    <button className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">{t.cancel}</button>
                    <button className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium shadow-sm transition-colors">{t.saveChanges}</button>
                </div>
            </div>
        </div>
    );
};