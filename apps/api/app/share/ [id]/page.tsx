
import { supabaseAdmin } from "@/lib/supabase";
import { notFound } from "next/navigation";
import Image from "next/image";

export const revalidate = 60; // Revalidate every minute

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function SharePage({ params }: PageProps) {
    const { id } = await params;

    const { data: page, error } = await supabaseAdmin
        .from("pages")
        .select("*")
        .eq("id", id)
        .single();

    if (error || !page) {
        notFound();
    }

    const domain = new URL(page.url).hostname.replace("www.", "");

    return (
        <div className="min-h-screen bg-[#FDFCF8] text-[#1A1A1A] font-sans flex flex-col items-center py-8 px-4">
            {/* Mobile-style Card */}
            <div className="w-full max-w-md bg-[#FFFFFF] rounded-[32px] overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-[#E5E5E1]">
                {/* Header Image */}
                {page.metadata?.image_url ? (
                    <div className="relative w-full aspect-video">
                        <Image
                            src={page.metadata.image_url}
                            alt={page.title || "Sift Cover"}
                            fill
                            className="object-cover"
                        />
                    </div>
                ) : (
                    <div className="w-full aspect-video bg-[#F2F2F7] flex items-center justify-center">
                        <span className="text-[#8E8E8E] text-4xl font-serif">S</span>
                    </div>
                )}

                {/* Content */}
                <div className="p-8">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="bg-[#1A1A1A] px-3 py-1 rounded-full">
                            <span className="text-[10px] font-bold text-white tracking-widest uppercase">
                                {page.tags?.[0] || "SAVED"}
                            </span>
                        </div>
                        <span className="text-[#8E8E8E] text-xs uppercase tracking-wider font-medium">
                            {domain} • {new Date(page.created_at).toLocaleDateString()}
                        </span>
                    </div>

                    <h1 className="text-3xl font-serif leading-tight mb-4 text-[#1A1A1A]">
                        {page.title}
                    </h1>

                    <div className="prose prose-sm max-w-none text-[#4A4A4A] leading-relaxed mb-8">
                        {page.summary && (
                            <blockquote className="border-l-4 border-[#E5E5E1] pl-4 italic text-[#8E8E8E] mb-6">
                                {page.summary}
                            </blockquote>
                        )}
                        <div className="whitespace-pre-wrap">
                            {page.content ? page.content.slice(0, 1000) + (page.content.length > 1000 ? '...' : '') : "No content available."}
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col gap-3">
                        <a
                            href={`sift://page/${id}`}
                            className="w-full bg-[#1A1A1A] text-[#FDFCF8] h-14 rounded-full flex items-center justify-center font-bold text-sm tracking-wide shadow-lg active:scale-95 transition-transform"
                        >
                            ADD TO MY SIFT LIBRARY
                        </a>
                        <a
                            href={page.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full bg-[#FFFFFF] text-[#1A1A1A] h-14 rounded-full flex items-center justify-center font-bold text-sm tracking-wide border border-[#E5E5E1] active:scale-95 transition-transform"
                        >
                            VIEW ORIGINAL POST
                        </a>
                    </div>
                </div>
            </div>

            {/* Footer Branding */}
            <div className="mt-8 flex flex-col items-center opacity-40">
                <div className="w-8 h-8 rounded-lg bg-[#1A1A1A] flex items-center justify-center mb-2">
                    <span className="text-white text-xs font-serif">S</span>
                </div>
                <span className="text-[10px] tracking-[0.2em] font-bold uppercase">Sift • Your Digital Mind</span>
            </div>
        </div>
    );
}
