const Layout = ({ children }: { children: React.ReactNode }) => {
        return (
                <main role="main" className="lg:pl-[72px] bg-light-primary dark:bg-dark-primary min-h-screen pb-24 lg:pb-8">
                        <a href="#main-content" className="skip-to-content">
                                Skip to content
                        </a>
                        <div id="main-content" className="mx-auto max-w-[48rem] px-5 sm:px-8 lg:px-10">
                                {children}
                        </div>
                </main>
        );
};

export default Layout;
