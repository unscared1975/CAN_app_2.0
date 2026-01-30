
import React from 'react';

interface LayoutProps {
    children: React.ReactNode;
    sidebar?: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children, sidebar }) => {
    return (
        <div className="h-screen flex flex-col md:flex-row bg-[#F8FAFC] overflow-hidden">
            <aside className="flex-shrink-0 md:h-full md:overflow-y-auto no-scrollbar z-[60]">
                {sidebar}
            </aside>
            <main className="flex-1 h-full overflow-y-auto p-2 md:p-6 pb-24 md:pb-6 relative scroll-smooth">
                {children}
            </main>
        </div>
    );
};
