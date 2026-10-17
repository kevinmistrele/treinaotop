import { Suspense } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { Brand } from "@/components/gym-hero";
import { ProfileSheet } from "@/components/profile-sheet";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { requireUser } from "@/lib/auth";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur">
          <SidebarTrigger aria-label="Abrir menu" />
          <span className="md:hidden">
            <Brand />
          </span>
          <div className="ml-auto">
            <Suspense fallback={null}>
              <UserButton />
            </Suspense>
          </div>
        </header>
        <div className="mx-auto w-full max-w-6xl p-4">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}

async function UserButton() {
  return <ProfileSheet user={await requireUser()} />;
}
