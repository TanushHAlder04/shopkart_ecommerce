'use client'

import Loading from "@/components/Loading"
import { useAuth } from "@clerk/nextjs"
import axios from "axios"
import toast from "react-hot-toast"
import { CircleDollarSignIcon, ShoppingBasketIcon, StarIcon, TagsIcon } from "lucide-react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

export default function Dashboard() {

    const {getToken} = useAuth()

    const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || '$'

    const router = useRouter()

    const [loading, setLoading] = useState(true)
    const [storeInfo, setStoreInfo] = useState(null)
    const [connectingStripe, setConnectingStripe] = useState(false)
    const [dashboardData, setDashboardData] = useState({
        totalProducts: 0,
        totalEarnings: 0,
        totalOrders: 0,
        ratings: [],
    })

    const dashboardCardsData = [
        { title: 'Total Products', value: dashboardData.totalProducts, icon: ShoppingBasketIcon },
        { title: 'Total Earnings', value: currency + dashboardData.totalEarnings, icon: CircleDollarSignIcon },
        { title: 'Total Orders', value: dashboardData.totalOrders, icon: TagsIcon },
        { title: 'Total Ratings', value: dashboardData.ratings.length, icon: StarIcon },
    ]

    const fetchDashboardData = async () => {
        try {
            let token = null;
            try {
                token = await getToken();
            } catch (e) {}
            const headers = token ? { Authorization: `Bearer ${token}` } : {};

            const { data: sellerData } = await axios.get('/api/store/is-seller', { headers });
            setStoreInfo(sellerData.storeInfo);

            const { data } = await axios.get('/api/store/dashboard', { headers });
            setDashboardData(data.dashboardData);
        } catch (error) {
            toast.error(error?.response?.data?.error || error.message);
        }
        setLoading(false);
    }

    const handleConnectStripe = async () => {
        try {
            setConnectingStripe(true);
            let token = null;
            try {
                token = await getToken();
            } catch (e) {}
            const headers = token ? { Authorization: `Bearer ${token}` } : {};
            const { data } = await axios.post('/api/store/onboard', {}, { headers });
            if (data.url) {
                window.location.href = data.url;
            }
        } catch (err) {
            toast.error(err?.response?.data?.error || err.message);
        } finally {
            setConnectingStripe(false);
        }
    }

    useEffect(() => {
        fetchDashboardData()
    }, [])

    if (loading) return <Loading />

    return (
        <div className=" text-slate-500 mb-28">
            <h1 className="text-2xl">Seller <span className="text-slate-800 font-medium">Dashboard</span></h1>

            {storeInfo && storeInfo.stripeAccountStatus !== 'active' && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 my-4 flex max-sm:flex-col items-center justify-between gap-4">
                    <div>
                        <h3 className="text-amber-800 font-medium">Stripe Connect Account Required</h3>
                        <p className="text-amber-700 text-sm">Connect your Stripe account to start receiving automated payouts for sold products.</p>
                    </div>
                    <button
                        id="connect-stripe-btn"
                        onClick={handleConnectStripe}
                        disabled={connectingStripe}
                        className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-medium transition whitespace-nowrap"
                    >
                        {connectingStripe ? "Connecting..." : "Connect Stripe"}
                    </button>
                </div>
            )}

            <div className="flex flex-wrap gap-5 my-10 mt-4">
                {
                    dashboardCardsData.map((card, index) => (
                        <div key={index} className="flex items-center gap-11 border border-slate-200 p-3 px-6 rounded-lg">
                            <div className="flex flex-col gap-3 text-xs">
                                <p>{card.title}</p>
                                <b className="text-2xl font-medium text-slate-700">{card.value}</b>
                            </div>
                            <card.icon size={50} className=" w-11 h-11 p-2.5 text-slate-400 bg-slate-100 rounded-full" />
                        </div>
                    ))
                }
            </div>

            <h2>Total Reviews</h2>

            <div className="mt-5">
                {
                    dashboardData.ratings.map((review, index) => (
                        <div key={index} className="flex max-sm:flex-col gap-5 sm:items-center justify-between py-6 border-b border-slate-200 text-sm text-slate-600 max-w-4xl">
                            <div>
                                <div className="flex gap-3">
                                    <Image src={review.user.image} alt="" className="w-10 aspect-square rounded-full" width={100} height={100} />
                                    <div>
                                        <p className="font-medium">{review.user.name}</p>
                                        <p className="font-light text-slate-500">{new Date(review.createdAt).toDateString()}</p>
                                    </div>
                                </div>
                                <p className="mt-3 text-slate-500 max-w-xs leading-6">{review.review}</p>
                            </div>
                            <div className="flex flex-col justify-between gap-6 sm:items-end">
                                <div className="flex flex-col sm:items-end">
                                    <p className="text-slate-400">{review.product?.category}</p>
                                    <p className="font-medium">{review.product?.name}</p>
                                    <div className='flex items-center'>
                                        {Array(5).fill('').map((_, index) => (
                                            <StarIcon key={index} size={17} className='text-transparent mt-0.5' fill={review.rating >= index + 1 ? "#00C950" : "#D1D5DB"} />
                                        ))}
                                    </div>
                                </div>
                                <button onClick={() => router.push(`/product/${review.product.id}`)} className="bg-slate-100 px-5 py-2 hover:bg-slate-200 rounded transition-all">View Product</button>
                            </div>
                        </div>
                    ))
                }
            </div>
        </div>
    )
}