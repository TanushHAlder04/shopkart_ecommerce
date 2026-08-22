'use client'
import { assets } from "@/assets/assets"
import { useAuth } from "@clerk/nextjs"
import axios from "axios"
import Image from "next/image"
import { useState, useEffect } from "react"
import { toast } from "react-hot-toast"

export default function StoreAddProduct() {

    const categories = ['Electronics', 'Clothing', 'Home & Kitchen', 'Beauty & Health', 'Toys & Games', 'Sports & Outdoors', 'Books & Media', 'Food & Drink', 'Hobbies & Crafts', 'Others']

    const [images, setImages] = useState({ 1: null, 2: null, 3: null, 4: null })
    const [productInfo, setProductInfo] = useState({
        name: "",
        description: "",
        mrp: 0,
        price: 0,
        category: "",
    })
    const [loading, setLoading] = useState(false)
    const [storeInfo, setStoreInfo] = useState(null)

    const {getToken} = useAuth()

    const fetchStoreStatus = async () => {
        try {
            let token = null;
            try {
                token = await getToken();
            } catch (e) {}
            const headers = token ? { Authorization: `Bearer ${token}` } : {};
            const { data } = await axios.get('/api/store/is-seller', { headers });
            setStoreInfo(data.storeInfo);
        } catch (err) {
            console.error(err);
        }
    }

    useEffect(() => {
        fetchStoreStatus()
    }, [])

    const onChangeHandler = (e) => {
        setProductInfo({ ...productInfo, [e.target.name]: e.target.value })
    }

    const onSubmitHandler = async (e) => {
        e.preventDefault()
        try {
            //if no images are uploaded then return
            if(!images[1] &&  !images[2] && !images[3] && !images[4]){
                return toast.error('Plsease upload atleast one image')
            }
            setLoading(true)

            const formData = new FormData()
            formData.append('name',productInfo.name)
            formData.append('description',productInfo.description)
            formData.append('mrp',productInfo.mrp)
            formData.append('price',productInfo.price)
            formData.append('category',productInfo.category)

            //Adding  Images To FormData
            Object.keys(images).forEach((key)=>{
                images[key] && formData.append('images',images[key])
            })

            const token = await getToken()
            const {data} = await axios.post('/api/store/product',formData,{
                headers: { Authorization:`Bearer ${token}`}})
            toast.success(data.message)

            //reset form
            setProductInfo({
                  name: "",
                  description: "",
                   mrp: 0,
                  price: 0,
                   category: "",
             })
    
        //reset imaages
        setImages({ 1: null, 2: null, 3: null, 4: null })

        } catch (error) {
           toast.error(error?.response?.data?.error || error.message)  
        }
        finally{
            setLoading(false)
        }

    }


    return (
        <form onSubmit={e => toast.promise(onSubmitHandler(e), { loading: "Adding Product..." })} className="text-slate-500 mb-28">
            <h1 className="text-2xl">Add New <span className="text-slate-800 font-medium">Products</span></h1>
            <p className="mt-7">Product Images</p>

            <div htmlFor="" className="flex gap-3 mt-4">
                {Object.keys(images).map((key) => (
                    <label key={key} htmlFor={`images${key}`}>
                        <Image width={300} height={300} className='h-15 w-auto border border-slate-200 rounded cursor-pointer' src={images[key] ? URL.createObjectURL(images[key]) : assets.upload_area} alt="" />
                        <input type="file" accept='image/*' id={`images${key}`} onChange={e => setImages({ ...images, [key]: e.target.files[0] })} hidden />
                    </label>
                ))}
            </div>

            <label htmlFor="" className="flex flex-col gap-2 my-6 ">
                Name
                <input type="text" name="name" onChange={onChangeHandler} value={productInfo.name} placeholder="Enter product name" className="w-full max-w-sm p-2 px-4 outline-none border border-slate-200 rounded" required />
            </label>

            <label htmlFor="" className="flex flex-col gap-2 my-6 ">
                Description
                <textarea name="description" onChange={onChangeHandler} value={productInfo.description} placeholder="Enter product description" rows={5} className="w-full max-w-sm p-2 px-4 outline-none border border-slate-200 rounded resize-none" required />
            </label>

            <div className="flex gap-5">
                <label htmlFor="" className="flex flex-col gap-2 ">
                    Actual Price ($)
                    <input type="number" name="mrp" onChange={onChangeHandler} value={productInfo.mrp} placeholder="0" rows={5} className="w-full max-w-45 p-2 px-4 outline-none border border-slate-200 rounded resize-none" required />
                </label>
                <label htmlFor="" className="flex flex-col gap-2 ">
                    Offer Price ($)
                    <input type="number" name="price" onChange={onChangeHandler} value={productInfo.price} placeholder="0" rows={5} className="w-full max-w-45 p-2 px-4 outline-none border border-slate-200 rounded resize-none" required />
                </label>
            </div>

            <select onChange={e => setProductInfo({ ...productInfo, category: e.target.value })} value={productInfo.category} className="w-full max-w-sm p-2 px-4 my-6 outline-none border border-slate-200 rounded" required>
                <option value="">Select a category</option>
                {categories.map((category) => (
                    <option key={category} value={category}>{category}</option>
                ))}
            </select>

            {storeInfo && storeInfo.stripeAccountStatus !== 'active' && (
                <p className="text-amber-600 text-sm mt-4 bg-amber-50 p-3 rounded border border-amber-200">
                    Product publishing is disabled until your Stripe Connect account is connected and activated in the dashboard.
                </p>
            )}

            <button
                id="add-product-btn"
                disabled={loading || (storeInfo && storeInfo.stripeAccountStatus !== 'active')}
                className="bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 mt-7 py-2 hover:bg-slate-900 rounded transition"
            >
                Add Product
            </button>
        </form>
    )
}