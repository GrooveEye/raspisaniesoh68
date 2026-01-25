import { Users, GraduationCap, BookOpen, Palette, DoorClosed, Calendar, CalendarDays, BarChart3, FileSpreadsheet, Settings, Home } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter, useSidebar } from "@/components/ui/sidebar";
const mainMenuItems = [{
  title: "Главная",
  url: "/",
  icon: Home
}];
const referenceItems = [{
  title: "Предметы",
  url: "/subjects",
  icon: BookOpen
}, {
  title: "Внеурочная деятельность",
  url: "/extracurricular",
  icon: Palette
}, {
  title: "Классы",
  url: "/classes",
  icon: GraduationCap
}, {
  title: "Кабинеты",
  url: "/rooms",
  icon: DoorClosed
}, {
  title: "Учителя",
  url: "/teachers",
  icon: Users
}];
const planningItems = [{
  title: "Учебный план",
  url: "/curriculum",
  icon: Calendar
}, {
  title: "Распределение",
  url: "/distribution",
  icon: BarChart3
}];
const scheduleItems = [{
  title: "Расписание",
  url: "/schedule",
  icon: CalendarDays
}];
const toolsItems = [{
  title: "Импорт/Экспорт",
  url: "/import-export",
  icon: FileSpreadsheet
}, {
  title: "Настройки",
  url: "/settings",
  icon: Settings
}];
export function AppSidebar() {
  const {
    state
  } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const currentPath = location.pathname;
  const [schoolName, setSchoolName] = useState<string>(() => {
    if (typeof window === "undefined") return "Школа";
    return localStorage.getItem("schoolName") || "Школа";
  });
  useEffect(() => {
    const sync = () => setSchoolName(localStorage.getItem("schoolName") || "Школа");
    window.addEventListener("storage", sync);
    window.addEventListener("schoolNameChanged", sync as EventListener);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("schoolNameChanged", sync as EventListener);
    };
  }, []);
  const isActive = (path: string) => currentPath === path;
  return <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <GraduationCap className="h-5 w-5" />
          </div>
          {!collapsed && <div className="flex flex-col min-w-0">
              <span className="font-semibold text-sidebar-foreground">Учебный план</span>
              <span className="text-xs text-muted-foreground truncate">{schoolName}</span>
            </div>}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainMenuItems.map(item => <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <NavLink to={item.url} className="flex items-center gap-2">
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Справочники</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {referenceItems.map(item => <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <NavLink to={item.url} className="flex items-center gap-2">
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Планирование</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {planningItems.map(item => <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <NavLink to={item.url} className="flex items-center gap-2">
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Расписание</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {scheduleItems.map(item => <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <NavLink to={item.url} className="flex items-center gap-2">
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Инструменты</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {toolsItems.map(item => <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <NavLink to={item.url} className="flex items-center gap-2">
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        {!collapsed && <p className="text-xs text-muted-foreground text-center">v.0.1 beta</p>}
      </SidebarFooter>
    </Sidebar>;
}