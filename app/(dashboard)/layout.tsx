import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "./_components/app-sidebar";
import { Navbar } from "./_components/navbar";

const DashboardLayout = ({
  children
}: {
  children: React.ReactNode;
}) => {
  return ( 
    <SidebarProvider>
      <div className="flex h-full w-full">
        <AppSidebar />
        <SidebarInset>
          <Navbar />
          <main className="h-full pt-4 px-6">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
   );
}
 
export default DashboardLayout;
