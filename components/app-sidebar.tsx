"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FiBarChart2, FiCheckSquare, FiList } from "react-icons/fi";
import { Brand } from "@/components/gym-hero";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const LINKS = [
  { href: "/", label: "Treino de hoje", icon: FiCheckSquare },
  { href: "/plano", label: "Plano semanal", icon: FiList },
  { href: "/historico", label: "Histórico", icon: FiBarChart2 },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <Link href="/" onClick={() => setOpenMobile(false)}>
          <Brand />
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {LINKS.map(({ href, label, icon: Icon }) => (
                <SidebarMenuItem key={href}>
                  <SidebarMenuButton
                    isActive={pathname === href}
                    size="lg"
                    className="font-heading tracking-wide uppercase data-active:text-sidebar-primary"
                    render={<Link href={href} onClick={() => setOpenMobile(false)} />}
                  >
                    <Icon />
                    <span>{label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
