import {
  Calendar,
  CalendarMinus,
  Home,
  Inbox,
  Search,
  Settings,
  User,
  Scissors,
} from 'lucide-react'

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'

// Menu items.
const items = [
  {
    title: 'Rezervacije',
    url: '/admin/',
    icon: Home,
  },
  {
    title: 'Usluge',
    url: '/admin/services',
    icon: Scissors,
  },
  {
    title: 'Godišnji',
    url: '/admin/vacation/',
    icon: Calendar,
  },
  {
    title: 'Korisnici',
    url: '/admin/users',
    icon: User,
  },
  {
    title: 'Obavještenja',
    url: '/admin/announcements',
    icon: CalendarMinus,
  },
  {
    title: 'Postavke',
    url: '/admin/settings',
    icon: Settings,
  },
]

export function AppSidebar() {
  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Barbershop</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <a href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
