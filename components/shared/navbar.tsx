import { Link } from "@/i18n/routing"

import { SiAuth0 } from "react-icons/si"
import { MainNav } from "@/components/shared/main-nav"
import { LocaleSwitcher } from "@/components/shared/button/locale-switcher"
import { UserButton } from "@/components/shared/button/user-button"
import { ModeToggle } from "@/components/shared/button/mode-toggle"

export const Navbar = () => {
  return (
    <header className="w-full sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b border-border shadow-xs">
      <nav className="h-16 px-4 flex items-center max-w-7xl mx-auto w-full">
        <Link href="/">
          <SiAuth0 />
        </Link>
        <MainNav />
        <div className="ml-auto flex items-center space-x-4">
          <LocaleSwitcher />
          <UserButton />
          <ModeToggle />
        </div>
      </nav>
    </header>
  )
}