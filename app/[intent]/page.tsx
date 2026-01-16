import ThreadsDownloader from "@/components/ThreadsDownloader";
import { Metadata } from "next";

type Props = {
    params: Promise<{ intent: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { intent } = await params;
    const title = getTitle(intent);
    return {
        title: `${title} - BulkThreadsDownloader`,
        description: `Free tool to ${title.toLowerCase()}. Download videos and images in bulk.`,
    };
}

function getTitle(intent: string) {
    switch (intent) {
        case "save-video":
            return "Threads Video Saver";
        case "save-images":
            return "Threads Image Downloader";
        case "download-videos":
            return "Threads Video Downloader";
        case "backup-account":
            return "Backup Threads Account";
        default:
            return "Threads Bulk Downloader";
    }
}

export default async function Page({ params }: Props) {
    const { intent } = await params;
    return <ThreadsDownloader title={getTitle(intent)} />;
}
