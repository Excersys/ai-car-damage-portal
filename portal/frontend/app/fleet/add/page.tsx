"use client";

import { addCar } from "@/lib/actions";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Car, Save, Upload, X } from "lucide-react";
import Link from "next/link";

export default function AddVehicle() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [images, setImages] = useState({
    front: "",
    rear: "",
    left: "",
    right: ""
  });

  const handleImageChange = (side: keyof typeof images, value: string) => {
    setImages(prev => ({ ...prev, [side]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const formData = new FormData(e.currentTarget);
    
    try {
        await addCar({
            make: formData.get('make') as string,
            model: formData.get('model') as string,
            year: Number(formData.get('year')),
            color: formData.get('color') as string,
            vin: formData.get('vin') as string,
            licensePlate: formData.get('plate') as string,
            mileage: Number(formData.get('mileage')),
            status: 'Available',
            imageUrl: images.front || 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=500&q=60', // Fallback
            lastInspectionDate: new Date().toISOString().split('T')[0]
        });
        alert("Vehicle Added Successfully");
        router.push("/fleet");
    } catch (error) {
        console.error(error);
        alert("Failed to add vehicle");
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/fleet" className="p-2 hover:bg-gray-100 rounded-full">
          <ArrowLeft className="h-5 w-5 text-gray-500" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Add New Vehicle</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white shadow sm:rounded-lg p-6 space-y-6 max-w-3xl">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <label htmlFor="make" className="block text-sm font-medium leading-6 text-gray-900">Make</label>
            <div className="mt-2">
              <input type="text" name="make" id="make" required className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6" placeholder="Toyota" />
            </div>
          </div>

          <div>
            <label htmlFor="model" className="block text-sm font-medium leading-6 text-gray-900">Model</label>
            <div className="mt-2">
              <input type="text" name="model" id="model" required className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6" placeholder="Camry" />
            </div>
          </div>

          <div>
            <label htmlFor="year" className="block text-sm font-medium leading-6 text-gray-900">Year</label>
            <div className="mt-2">
              <input type="number" name="year" id="year" required min="2000" max={new Date().getFullYear() + 1} className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6" placeholder="2024" />
            </div>
          </div>

          <div>
            <label htmlFor="color" className="block text-sm font-medium leading-6 text-gray-900">Color</label>
            <div className="mt-2">
              <input type="text" name="color" id="color" required className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6" placeholder="Silver" />
            </div>
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="vin" className="block text-sm font-medium leading-6 text-gray-900">VIN (Vehicle Identification Number)</label>
            <div className="mt-2">
              <input type="text" name="vin" id="vin" required className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 uppercase" placeholder="1HGCM82633A..." />
            </div>
          </div>

          <div>
            <label htmlFor="plate" className="block text-sm font-medium leading-6 text-gray-900">License Plate</label>
            <div className="mt-2">
              <input type="text" name="plate" id="plate" required className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 uppercase" placeholder="ABC-1234" />
            </div>
          </div>

          <div>
            <label htmlFor="mileage" className="block text-sm font-medium leading-6 text-gray-900">Current Mileage</label>
            <div className="mt-2">
              <input type="number" name="mileage" id="mileage" required className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6" placeholder="0" />
            </div>
          </div>

          <div className="sm:col-span-2">
             <label className="block text-sm font-medium leading-6 text-gray-900 mb-4">Initial State Photos (Required for AI Baseline)</label>
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {(['front', 'rear', 'left', 'right'] as const).map((side) => (
                    <div key={side} className="border rounded-lg p-3 bg-gray-50">
                        <label htmlFor={`img-${side}`} className="block text-xs font-medium text-gray-700 uppercase mb-2 text-center">{side} View</label>
                        {images[side] ? (
                            <div className="relative aspect-video bg-gray-200 rounded overflow-hidden group">
                                <img src={images[side]} alt={`${side} view`} className="w-full h-full object-cover" />
                                <button 
                                    type="button"
                                    onClick={() => handleImageChange(side, "")}
                                    className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            </div>
                        ) : (
                           <div className="aspect-video bg-white border-2 border-dashed border-gray-300 rounded flex flex-col items-center justify-center text-gray-400 hover:bg-gray-50 transition-colors">
                                <Upload className="h-6 w-6 mb-1" />
                                <span className="text-xs">Upload URL</span>
                           </div>
                        )}
                         <input 
                            type="url" 
                            id={`img-${side}`}
                            name={`img-${side}`}
                            value={images[side]}
                            onChange={(e) => handleImageChange(side, e.target.value)}
                            placeholder="https://..."
                            className="mt-2 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-xs sm:leading-6"
                         />
                    </div>
                ))}
             </div>
          </div>
        </div>

        <div className="flex justify-end gap-4 pt-4 border-t border-gray-200">
            <button type="button" onClick={() => router.back()} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
                Cancel
            </button>
            <button 
                type="submit" 
                disabled={isSubmitting}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50"
            >
                <Save className="h-4 w-4" />
                {isSubmitting ? 'Saving...' : 'Save Vehicle'}
            </button>
        </div>
      </form>
    </div>
  );
}

