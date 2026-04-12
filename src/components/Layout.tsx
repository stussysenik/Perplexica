const Layout = ({ children }: { children: React.ReactNode }) => {
        return (
                <main role="main" className="lg:pl-[56px] bg-[var(--bg-primary)] min-h-screen pb-20 lg:pb-8">
                        <a href="#main-content" className="skip-to-content">
                                Skip to content
                        </a>
                        <div id="main-content" className="mx-auto max-w-[48rem] px-4 sm:px-6 lg:px-8">
                                {children}
                        </div>
                </main>
        );
};

export default Layout;
