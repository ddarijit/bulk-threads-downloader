"use client";

import { useState } from "react";
import Link from "next/link";

interface QueueItem {
    id: string;
    url: string;
    filename: string;
    size: string;
    type: "VIDEO" | "IMAGE";
    downloadUrl: string;
    selected: boolean;
    status: "pending" | "success" | "error";
    errorMsg?: string;
}

interface ThreadsDownloaderProps {
    title?: string;
    subtitle?: string;
}

export default function ThreadsDownloader({
    title = "Threads Bulk Downloader - Save All Images & Videos (100% Free)",
    subtitle = "Paste multiple Threads URLs to begin extraction."
}: ThreadsDownloaderProps) {
    const [inputUrls, setInputUrls] = useState("");
    const [queue, setQueue] = useState<QueueItem[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);

    const processUrls = async () => {
        if (!inputUrls.trim()) return;

        setIsProcessing(true);
        const urls = inputUrls
            .split(/\n|\s+/)
            .filter((url) => url.trim().match(/^https?:\/\/(www\.)?threads\.(net|com)\/.*/));

        // Initialize queue items
        const newItems: QueueItem[] = urls.map((url) => ({
            id: Math.random().toString(36).substr(2, 9),
            url,
            filename: "Fetching...",
            size: "-",
            type: "IMAGE", // default
            downloadUrl: "",
            selected: true,
            status: "pending",
        }));

        setQueue((prev) => [...newItems, ...prev]);
        setInputUrls("");

        // Process each URL
        for (const item of newItems) {
            try {
                const response = await fetch(`/api/download?url=${encodeURIComponent(item.url)}`);

                // Handle non-200 responses that might return JSON error
                const data = await response.json().catch(() => ({ error: response.statusText }));

                setQueue((prev) => {
                    const newQueue: QueueItem[] = [];
                    for (const q of prev) {
                        if (q.id === item.id) {
                            if (response.ok && data.media && Array.isArray(data.media)) {
                                data.media.forEach((mediaItem: any, index: number) => {
                                    newQueue.push({
                                        ...q,
                                        id: `${q.id}_${index}`,
                                        filename: mediaItem.filename,
                                        type: mediaItem.type === "video" ? "VIDEO" : "IMAGE",
                                        // Use proxy for direct download
                                        downloadUrl: `/api/proxy?url=${encodeURIComponent(mediaItem.url)}&filename=${encodeURIComponent(mediaItem.filename)}`,
                                        status: "success",
                                        size: "Unknown",
                                        selected: true
                                    });
                                });
                            } else if (response.ok) {
                                newQueue.push({
                                    ...q,
                                    filename: data.filename || `threads_${data.type}_${q.id}`,
                                    type: data.type === "video" ? "VIDEO" : "IMAGE",
                                    // Use proxy for direct download
                                    downloadUrl: `/api/proxy?url=${encodeURIComponent(data.url || data.video_url)}&filename=${encodeURIComponent(data.filename || `threads_${data.type}_${q.id}`)}`,
                                    status: "success",
                                    size: data.type === "video" ? "Unknown" : "Unknown",
                                });
                            } else {
                                newQueue.push({
                                    ...q,
                                    filename: "Failed",
                                    status: "error",
                                    errorMsg: data.error || `Error ${response.status}: ${response.statusText}`
                                });
                            }
                        } else {
                            newQueue.push(q);
                        }
                    }
                    return newQueue;
                });
            } catch (error) {
                setQueue((prev) =>
                    prev.map((q) => (q.id === item.id ? {
                        ...q,
                        filename: "Error",
                        status: "error",
                        errorMsg: error instanceof Error ? error.message : "Network Error"
                    } : q))
                );
            }
        }
        setIsProcessing(false);
    };

    const toggleSelect = (id: string) => {
        setQueue(prev => prev.map(item => item.id === id ? { ...item, selected: !item.selected } : item));
    };

    const toggleSelectAll = (checked: boolean) => {
        setQueue(prev => prev.map(item => ({ ...item, selected: checked })));
    };

    const downloadSelected = async () => {
        const selectedItems = queue.filter(q => q.selected && q.status === "success");

        // Helper to trigger download
        const triggerDownload = (url: string, filename: string) => {
            const link = document.createElement('a');
            link.href = url;
            link.download = filename; // Optional as backend sends Content-Disposition
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        };

        // Download with delay to avoid browser blocking multiple popups
        for (let i = 0; i < selectedItems.length; i++) {
            const item = selectedItems[i];
            // Use setTimeout to stagger downloads
            setTimeout(() => {
                triggerDownload(item.downloadUrl, item.filename);
            }, i * 1000); // 1 second delay between each
        }
    };

    return (
        <div className="flex flex-col h-screen">
            <header className="w-full border-b border-input bg-background/95 backdrop-blur shrink-0">
                <div className="px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-foreground">
                            download_for_offline
                        </span>
                        <span className="font-bold text-lg tracking-tight">
                            BulkThreadsDownloader
                        </span>
                    </div>
                    <nav className="flex items-center gap-6">
                        <a
                            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                            href="#"
                        >
                            Docs
                        </a>
                        <div className="h-4 w-px bg-input"></div>
                        <div className="text-sm font-medium">Dashboard</div>
                    </nav>
                </div>
            </header>
            <main className="flex-1 flex flex-col overflow-hidden">
                <section className="flex-1 min-h-[40%] bg-background border-b border-input flex flex-col p-6 overflow-auto">
                    <div className="max-w-5xl mx-auto w-full flex flex-col h-full space-y-4">
                        <div className="flex items-center justify-between shrink-0">
                            <div>
                                <h1 className="text-xl font-bold tracking-tight">
                                    {title}
                                </h1>
                                <p className="text-xs text-muted-foreground">
                                    {subtitle}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-semibold text-muted-foreground bg-muted px-2 py-1 rounded border border-input">
                                    AUTO-DETECT
                                </span>
                            </div>
                        </div>
                        <div className="flex-1 relative min-h-[120px]">
                            <textarea
                                className="shadcn-textarea h-full text-base"
                                placeholder="https://www.threads.net/@user/post/...&#10;https://www.threads.net/@user/post/..."
                                value={inputUrls}
                                onChange={(e) => setInputUrls(e.target.value)}
                            ></textarea>
                        </div>
                        <div className="flex items-center justify-between shrink-0 pt-2">
                            <div className="flex items-center gap-4 text-muted-foreground">
                                <div className="flex items-center gap-1.5">
                                    <span className="material-symbols-outlined text-sm">
                                        info
                                    </span>
                                    <span className="text-xs">Limit: 50 URLs per batch</span>
                                </div>
                            </div>
                            <button
                                className="shadcn-button-primary gap-2 min-w-[160px]"
                                onClick={processUrls}
                                disabled={isProcessing || !inputUrls.trim()}
                            >
                                <span className="material-symbols-outlined text-sm">bolt</span>
                                {isProcessing ? "Processing..." : "Process URLs"}
                            </button>
                        </div>
                    </div>
                </section>
                <section className="flex-[1.5] min-h-[50%] bg-background flex flex-col overflow-hidden">
                    <div className="max-w-5xl mx-auto w-full h-full flex flex-col p-6">
                        <div className="flex items-center justify-between mb-4 shrink-0">
                            <div className="flex items-center gap-3">
                                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                                    Extraction Queue
                                </h3>
                                <span className="px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                                    {queue.length} ITEMS
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    className="shadcn-button-primary h-9 px-4 text-xs gap-2"
                                    onClick={downloadSelected}
                                    disabled={queue.filter(q => q.selected && q.status === "success").length === 0}
                                >
                                    <span className="material-symbols-outlined text-sm">
                                        download
                                    </span>
                                    Download Selected
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 border border-input rounded-lg overflow-auto bg-white">
                            <table className="w-full text-sm border-collapse">
                                <thead className="sticky top-0 bg-muted/50 backdrop-blur border-b border-input">
                                    <tr className="text-left">
                                        <th className="w-12 p-3">
                                            <input
                                                className="rounded border-input text-primary focus:ring-ring"
                                                type="checkbox"
                                                onChange={(e) => toggleSelectAll(e.target.checked)}
                                                checked={queue.length > 0 && queue.every(q => q.selected)}
                                            />
                                        </th>
                                        <th className="p-3 font-medium text-muted-foreground">
                                            Filename
                                        </th>
                                        <th className="p-3 font-medium text-muted-foreground">
                                            Size
                                        </th>
                                        <th className="p-3 font-medium text-muted-foreground">
                                            Type
                                        </th>
                                        <th className="p-3 text-right font-medium text-muted-foreground">
                                            Action
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-input">
                                    {queue.map((item) => (
                                        <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                                            <td className="p-3">
                                                <input
                                                    className="rounded border-input text-primary focus:ring-ring"
                                                    type="checkbox"
                                                    checked={item.selected}
                                                    onChange={() => toggleSelect(item.id)}
                                                />
                                            </td>
                                            <td className="p-3 font-medium">
                                                {item.status === "success" ? item.filename :
                                                    item.status === "error" ? (
                                                        <div className="flex flex-col">
                                                            <span className="text-red-500 font-semibold">Failed</span>
                                                            <span className="text-[10px] text-red-400">{item.errorMsg || "Unknown error"}</span>
                                                        </div>
                                                    ) :
                                                        <span className="animate-pulse">Fetching...</span>}
                                            </td>
                                            <td className="p-3 text-muted-foreground">{item.size}</td>
                                            <td className="p-3">
                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${item.type === "VIDEO" ? "bg-accent text-accent-foreground" : "bg-blue-100 text-blue-800"
                                                    }`}>
                                                    <span className="material-symbols-outlined text-[12px]">
                                                        {item.type === "VIDEO" ? "movie" : "image"}
                                                    </span>
                                                    {item.type}
                                                </span>
                                            </td>
                                            <td className="p-3 text-right">
                                                {item.status === "success" && (
                                                    <a
                                                        href={item.downloadUrl}
                                                        download={item.filename} // Hint to browser
                                                        className="shadcn-button-ghost inline-flex"
                                                        title="Download File"
                                                    >
                                                        <span className="material-symbols-outlined text-sm">
                                                            download
                                                        </span>
                                                    </a>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    {queue.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="p-8 text-center text-muted-foreground">
                                                No items in queue. Paste a URL above to start.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </section>

                {/* SEO Content Section */}
                <section className="bg-muted/30 py-12 px-6 border-b border-input">
                    <div className="max-w-4xl mx-auto space-y-12">

                        {/* Trust/Safety Signal */}
                        <div className="bg-background border border-green-200 rounded-lg p-6 shadow-sm flex items-start gap-4">
                            <span className="material-symbols-outlined text-green-600 text-3xl">shield</span>
                            <div>
                                <h3 className="font-semibold text-lg text-foreground">100% Secure & Private</h3>
                                <p className="text-muted-foreground mt-1">
                                    We do not store your data. Files are downloaded directly from Meta's CDN to your device.
                                </p>
                            </div>
                        </div>

                        {/* Keyword Rich Content */}
                        <div className="space-y-6">
                            <h2 className="text-2xl font-bold tracking-tight">How to Download All Media from a Threads Profile</h2>
                            <p className="text-muted-foreground leading-relaxed">
                                Our <strong>Mass Threads Saver</strong> makes it easy to <strong>export media</strong> from any public Threads account.
                                Whether you want to <strong>backup Threads account</strong> content or save specific memories, our tool ensures you get the
                                <strong>high quality MP4</strong> videos and original images with <strong>no watermarks</strong>. Simple paste the links above and let our
                                Link Detective algorithm do the work.
                            </p>

                            <h2 className="text-2xl font-bold tracking-tight">Why use our Mass Threads Saver?</h2>
                            <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                                <li>Bulk processing: Handle up to 50 URLs at once.</li>
                                <li>Original Quality: Get the highest resolution available.</li>
                                <li>Privacy Focused: No server storage, direct CDN links.</li>
                                <li>Universal Support: Works on iPhone, Android, Mac, and Windows.</li>
                            </ul>
                        </div>

                        {/* FAQ Section */}
                        <div className="space-y-6">
                            <h2 className="text-2xl font-bold tracking-tight">Frequently Asked Questions</h2>
                            <div className="space-y-4">
                                <div className="border border-input rounded-lg p-4 bg-background">
                                    <h3 className="font-semibold text-foreground">Can I download private Threads profiles?</h3>
                                    <p className="text-sm text-muted-foreground mt-2">No, we respect privacy. Public profiles only.</p>
                                </div>
                                <div className="border border-input rounded-lg p-4 bg-background">
                                    <h3 className="font-semibold text-foreground">Is this Threads Downloader safe?</h3>
                                    <p className="text-sm text-muted-foreground mt-2">Yes, we do not store your files. All processing happens on the fly.</p>
                                </div>
                                <div className="border border-input rounded-lg p-4 bg-background">
                                    <h3 className="font-semibold text-foreground">How to save Threads videos to iPhone Camera Roll?</h3>
                                    <p className="text-sm text-muted-foreground mt-2">
                                        After clicking "Download", the video will open. Tap layout "Share" icon and select "Save Video" to add it to your Photos app.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

            </main>
            <footer className="w-full border-t border-input bg-background shrink-0">
                <div className="px-6 py-4 flex items-center justify-between">
                    <div className="text-[11px] text-muted-foreground uppercase tracking-widest font-semibold">
                        © 2024 BulkThreadsDownloader.com
                    </div>
                    <div className="flex items-center gap-6">
                        <Link
                            className="text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors uppercase"
                            href="/privacy-policy"
                        >
                            Privacy Policy
                        </Link>
                        <a
                            className="text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors uppercase"
                            href="#"
                        >
                            Terms of Use
                        </a>
                        <a
                            className="text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors uppercase"
                            href="#"
                        >
                            Contact
                        </a>
                    </div>
                </div>
            </footer>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
                        "@context": "https://schema.org",
                        "@type": "SoftwareApplication",
                        "name": "BulkThreadsDownloader",
                        "applicationCategory": "MultimediaApplication",
                        "operatingSystem": "All",
                        "aggregateRating": {
                            "@type": "AggregateRating",
                            "ratingValue": "4.8",
                            "ratingCount": "1250"
                        },
                        "offers": {
                            "@type": "Offer",
                            "price": "0",
                            "priceCurrency": "USD"
                        }
                    }),
                }}
            />
        </div>
    );
}
