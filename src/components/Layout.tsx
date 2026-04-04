const Layout = ({ children }: { children: React.ReactNode }) => {
        return (
                <main className="lg:pl-[72px] bg-light-primary dark:bg-dark-primary min-h-screen pb-20 lg:pb-0">
                        <div className="mx-auto max-w-[48rem] px-4 sm:px-6 lg:px-8">
                                {children}
                        </div>
                </main>
        );
};

export default Layout;
