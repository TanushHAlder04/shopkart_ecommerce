'use client'
import { Search, ShoppingCart, PackageIcon, Menu, X, ArrowRight } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { useSelector } from "react-redux"
import { useUser, useClerk, UserButton } from "@clerk/nextjs"

import Banner from "@/components/Banner"

const Navbar = () => {
    const { user } = useUser()
    const { openSignIn } = useClerk()
    const router = useRouter()

    const [search, setSearch] = useState('')
    const [isScrolled, setIsScrolled] = useState(false)
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
    const cartCount = useSelector(state => state.cart.total)

    useEffect(() => {
        const handleScroll = () => setIsScrolled(window.scrollY > 20)
        window.addEventListener('scroll', handleScroll, { passive: true })
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    const handleSearch = (e) => {
        e.preventDefault()
        router.push(`/shop?search=${search}`)
        setIsMobileMenuOpen(false)
    }

    return (
        <header className="fixed top-3 left-1/2 -translate-x-1/2 w-[92%] max-w-5xl z-50 flex flex-col gap-2 pointer-events-none">
            {/* Top Notification Banner */}
            <Banner />

            {/* Main Pill Navbar */}
            <nav
                className={`w-full rounded-full transition-all duration-300 ease-in-out border pointer-events-auto ${isScrolled
                    ? 'bg-white/85 backdrop-blur-xl shadow-lg shadow-black/5 border-slate-200/80 py-2 sm:py-2.5 px-4 sm:px-6'
                    : 'bg-white/70 backdrop-blur-md shadow-sm border-slate-200/60 py-2.5 sm:py-3 px-4 sm:px-6'
                    }`}
                aria-label="Main Navigation"
            >
                <div className="flex items-center justify-between gap-3">
                    {/* Logo */}
                    <Link
                        href="/"
                        className="relative flex items-center text-2xl font-semibold text-slate-700 shrink-0 select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-black rounded-full"
                    >
                        <span className="text-blue-700">Shop</span>Kart
                        {user?.publicMetadata?.plan === 'plus' && (
                            <span className="absolute -top-2 -right-8 text-[10px] font-semibold px-2 py-0.5 rounded-full text-white bg-blue-600">
                                plus
                            </span>
                        )}
                    </Link>

                    {/* Center: Desktop Links */}
                    <div className="hidden md:flex items-center gap-1 lg:gap-2 text-[14px] font-medium text-slate-600">
                        <Link
                            href="/"
                            className="px-3 py-1.5 rounded-full hover:text-black hover:bg-neutral-100/70 transition-all duration-150"
                        >
                            Home
                        </Link>
                        <Link
                            href="/shop"
                            className="px-3 py-1.5 rounded-full hover:text-black hover:bg-neutral-100/70 transition-all duration-150"
                        >
                            Shop
                        </Link>
                        <Link
                            href="/#about"
                            className="px-3 py-1.5 rounded-full hover:text-black hover:bg-neutral-100/70 transition-all duration-150"
                        >
                            About
                        </Link>
                    </div>

                    {/* Desktop Search */}
                    <form
                        onSubmit={handleSearch}
                        className="hidden xl:flex items-center w-64 text-sm gap-2 bg-neutral-100/80 px-4 py-2 rounded-full"
                    >
                        <Search size={16} className="text-slate-500 shrink-0" />
                        <input
                            className="w-full bg-transparent outline-none placeholder-slate-500 text-slate-700"
                            type="text"
                            placeholder="Search products"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </form>

                    {/* Right: Desktop Actions */}
                    <div className="hidden md:flex items-center gap-2 lg:gap-3 text-[14px]">
                        <Link
                            href="/cart"
                            className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-full text-slate-600 hover:text-black hover:bg-neutral-100/70 transition-all duration-150"
                        >
                            <ShoppingCart size={17} />
                            <span className="hidden lg:inline">Cart</span>
                            <span className="absolute -top-1 -right-1 text-[9px] leading-none text-white bg-black size-4 flex items-center justify-center rounded-full">
                                {cartCount}
                            </span>
                        </Link>

                        {!user ? (
                            <button
                                onClick={openSignIn}
                                className="inline-flex items-center gap-1.5 px-4 py-2 font-medium text-white bg-black hover:bg-neutral-800 rounded-full shadow-sm shadow-black/10 transition-all duration-150 active:scale-95 group"
                            >
                                <span>Login</span>
                                <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform duration-200" />
                            </button>
                        ) : (
                            <div className="pl-1">
                                <UserButton>
                                    <UserButton.MenuItems>
                                        <UserButton.Action
                                            labelIcon={<PackageIcon size={16} />}
                                            label="My Orders"
                                            onClick={() => router.push('/orders')}
                                        />
                                    </UserButton.MenuItems>
                                </UserButton>
                            </div>
                        )}
                    </div>

                    {/* Mobile: Cart + User/Login + Menu Toggle */}
                    <div className="flex md:hidden items-center gap-1.5">
                        <Link
                            href="/cart"
                            className="relative p-2 text-slate-600 hover:text-black hover:bg-neutral-100 rounded-full transition-colors"
                        >
                            <ShoppingCart size={19} />
                            <span className="absolute top-0 right-0 text-[9px] leading-none text-white bg-black size-4 flex items-center justify-center rounded-full">
                                {cartCount}
                            </span>
                        </Link>

                        {user ? (
                            <UserButton>
                                <UserButton.MenuItems>
                                    <UserButton.Action
                                        labelIcon={<PackageIcon size={16} />}
                                        label="My Orders"
                                        onClick={() => router.push('/orders')}
                                    />
                                </UserButton.MenuItems>
                            </UserButton>
                        ) : (
                            <button
                                onClick={openSignIn}
                                className="text-xs px-3 py-1.5 font-medium text-white bg-black rounded-full"
                            >
                                Login
                            </button>
                        )}

                        <button
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            className="p-1.5 text-neutral-700 hover:text-black hover:bg-neutral-100 rounded-full transition-colors focus:outline-none"
                            aria-label="Toggle mobile navigation menu"
                        >
                            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
                        </button>
                    </div>
                </div>
            </nav>

            {/* Mobile Expanded Menu Panel */}
            {isMobileMenuOpen && (
                <div className="md:hidden mt-2 p-5 bg-white/95 backdrop-blur-2xl rounded-3xl border border-slate-200/80 shadow-2xl shadow-black/10 animate-in fade-in zoom-in-95 duration-200 pointer-events-auto">
                    <form
                        onSubmit={handleSearch}
                        className="flex items-center gap-2 bg-neutral-100 px-4 py-2.5 rounded-full mb-4"
                    >
                        <Search size={16} className="text-slate-500 shrink-0" />
                        <input
                            className="w-full bg-transparent outline-none placeholder-slate-500 text-slate-700 text-sm"
                            type="text"
                            placeholder="Search products"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </form>

                    <div className="flex flex-col gap-3 text-sm font-medium text-neutral-700">
                        <div className="py-2 border-b border-neutral-100">
                            <p className="text-xs uppercase tracking-wider text-neutral-400 font-semibold mb-2">
                                Navigation
                            </p>
                            <Link
                                href="/"
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="block py-2 px-3 rounded-lg hover:bg-neutral-100 transition-colors"
                            >
                                Home
                            </Link>
                            <Link
                                href="/shop"
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="block py-2 px-3 rounded-lg hover:bg-neutral-100 transition-colors"
                            >
                                Shop
                            </Link>
                            <Link
                                href="/#about"
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="block py-2 px-3 rounded-lg hover:bg-neutral-100 transition-colors"
                            >
                                About
                            </Link>
                        </div>

                        {!user && (
                            <div className="pt-2">
                                <button
                                    onClick={() => {
                                        setIsMobileMenuOpen(false)
                                        openSignIn()
                                    }}
                                    className="w-full flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-full bg-black text-white font-medium hover:bg-neutral-800 transition-colors"
                                >
                                    <span>Login</span>
                                    <ArrowRight size={14} />
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </header>
    )
}

export default Navbar