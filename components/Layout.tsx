
import React from 'react';

interface LayoutProps {
    children: React.ReactNode;
    sidebar?: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children, sidebar }) => {
    return (
        <div className="min-h-screen flex flex-col md:flex-row bg-[#F8FAFC]">
            {sidebar}
            <main className="flex-1 p-2 md:p-6 pb-24 md:pb-6 overflow-y-auto">
                {children}
            </main>
        </div>
    );
};
