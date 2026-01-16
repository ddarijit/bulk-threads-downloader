export default function PrivacyPolicy() {
    return (
        <div className="max-w-3xl mx-auto py-12 px-4 sm:px-6 lg:px-8 text-gray-800 dark:text-gray-200">
            <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
            <p className="mb-4 text-sm text-gray-500">Effective Date: January 17, 2026</p>

            <p className="mb-6">
                At <strong>BulkThreadsDownloader.com</strong> (&quot;we,&quot; &quot;our,&quot; or &quot;the Service&quot;), your privacy is our priority.
                We have built this tool with a strict <strong>&quot;No-Log&quot;</strong> architecture. This Privacy Policy outlines
                what information we collect, how we use it, and your rights regarding your data.
            </p>

            <h2 className="text-xl font-semibold mt-8 mb-4">1. Information We Do Not Collect (Zero-Log Policy)</h2>
            <ul className="list-disc pl-5 space-y-2 mb-6">
                <li><strong>No File Storage:</strong> We do not download, host, or store any videos, images, or media files on our servers. All media is downloaded directly from Meta&apos;s Content Delivery Network (CDN) to your personal device.</li>
                <li><strong>No URL Tracking:</strong> We do not log or save the URLs you input into our search bar.</li>
                <li><strong>No Personal Identity Information (PII):</strong> We do not require account creation, and we do not collect your name, email address, or phone number to use the core service.</li>
            </ul>

            <h2 className="text-xl font-semibold mt-8 mb-4">2. Information We Do Collect (Technical & Analytics)</h2>
            <ul className="list-disc pl-5 space-y-2 mb-6">
                <li><strong>Server Logs:</strong> Temporary data such as IP addresses, browser types, and request times to prevent DDoS attacks and spam. These are auto-deleted after 24 hours.</li>
                <li><strong>Analytics:</strong> We use privacy-first analytics to understand aggregated traffic patterns (e.g., total visitors per day). This data is anonymized.</li>
                <li><strong>Cookies:</strong> We use functional cookies to remember your display preferences and advertising cookies provided by our ad partners.</li>
            </ul>

            <h2 className="text-xl font-semibold mt-8 mb-4">3. Contact Us</h2>
            <p className="mb-6">
                If you have questions about this policy or wish to exercise your data rights, please contact us at:
                <br />
                <strong>Email:</strong> <a href="mailto:zzlabonline@proton.me" className="text-blue-600 hover:underline">zzlabonline@proton.me</a>
            </p>
        </div>
    );
}
