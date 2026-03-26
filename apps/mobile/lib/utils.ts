// Simple implementation since clsx/tailwind-merge are not installed
// and we want to avoid adding dependencies if possible for this simple task.
// If the user wants robust class merging, they should install clsx and tailwind-merge.

export function cn(...inputs: (string | undefined | null | false)[]) {
    return inputs.filter(Boolean).join(' ');
}

// Helper to group pages by date
export function groupPagesByDate(pages: any[]) {
    const groups: { [key: string]: any[] } = {
        'Today': [],
        'Yesterday': [],
        'Earlier': []
    };

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterday = new Date(today - 86400000).getTime();

    pages.forEach(page => {
        const date = new Date(page.created_at).getTime();
        if (date >= today) {
            groups['Today'].push(page);
        } else if (date >= yesterday) {
            groups['Yesterday'].push(page);
        } else {
            groups['Earlier'].push(page);
        }
    });

    // Convert to SectionList format
    return Object.keys(groups)
        .filter(key => groups[key].length > 0)
        .map(key => ({
            title: key,
            data: groups[key]
        }));
}

// Safely extracts the domain/hostname from a URL string without throwing errors.
export const getDomain = (url: string | null | undefined): string => {
    if (!url) return 'sift.app';

    try {
        const safeUrl = url.startsWith('http') ? url : `https://${url}`;
        const urlObj = new URL(safeUrl);
        return urlObj.hostname.replace('www.', '');
    } catch (e) {
        return 'sift.app';
    }
};

// Maps a URL domain to a smart default tag for initial categorization.
// All values must be from ALLOWED_TAGS in the API so smart collections can match them.
const DOMAIN_TAG_MAP: Record<string, string> = {
    // Entertainment
    'youtube.com': 'Entertainment',
    'youtu.be': 'Entertainment',
    'vimeo.com': 'Entertainment',
    'tiktok.com': 'Entertainment',
    'twitch.tv': 'Gaming',
    'netflix.com': 'Entertainment',
    // Social / Lifestyle
    'twitter.com': 'Lifestyle',
    'x.com': 'Lifestyle',
    'instagram.com': 'Lifestyle',
    'facebook.com': 'Lifestyle',
    'threads.net': 'Lifestyle',
    'reddit.com': 'Entertainment',
    'linkedin.com': 'Professional',
    'bsky.app': 'Lifestyle',
    // News
    'nytimes.com': 'News',
    'washingtonpost.com': 'News',
    'theguardian.com': 'News',
    'bbc.com': 'News',
    'bbc.co.uk': 'News',
    'cnn.com': 'News',
    'reuters.com': 'News',
    'apnews.com': 'News',
    // Finance
    'bloomberg.com': 'Finance',
    'investopedia.com': 'Finance',
    'fool.com': 'Finance',
    // Tech
    'techcrunch.com': 'Tech',
    'theverge.com': 'Tech',
    'arstechnica.com': 'Tech',
    'wired.com': 'Tech',
    'hackernews.com': 'Tech',
    'news.ycombinator.com': 'Tech',
    'github.com': 'Tech',
    'stackoverflow.com': 'Tech',
    'dev.to': 'Tech',
    // Science / Education
    'arxiv.org': 'Science',
    'scholar.google.com': 'Science',
    'nature.com': 'Science',
    'science.org': 'Science',
    'pubmed.ncbi.nlm.nih.gov': 'Health',
    'medium.com': 'Education',
    'substack.com': 'News',
    // Shopping
    'amazon.com': 'Shopping',
    'ebay.com': 'Shopping',
    'etsy.com': 'Shopping',
    // Food
    'allrecipes.com': 'Cooking',
    'seriouseats.com': 'Cooking',
    'bonappetit.com': 'Cooking',
    'food52.com': 'Cooking',
    'kingarthurbaking.com': 'Baking',
    // Music
    'spotify.com': 'Music',
    'open.spotify.com': 'Music',
    'soundcloud.com': 'Music',
    'music.apple.com': 'Music',
    // Travel
    'tripadvisor.com': 'Travel',
    'airbnb.com': 'Travel',
    'booking.com': 'Travel',
    // Fitness
    'strava.com': 'Fitness',
    // DIY
    'instructables.com': 'DIY',
    'pinterest.com': 'DIY',
};

export const getSmartTag = (url: string | null | undefined): string => {
    if (!url) return 'Saved';
    const domain = getDomain(url);
    // Check exact match first, then try parent domain
    if (DOMAIN_TAG_MAP[domain]) return DOMAIN_TAG_MAP[domain];
    // Check if any key is a suffix of the domain (e.g., m.youtube.com → youtube.com)
    for (const [key, tag] of Object.entries(DOMAIN_TAG_MAP)) {
        if (domain.endsWith(key)) return tag;
    }
    return 'Saved';
};

// Strips markdown formatting to produce clean plain-text for compact preview cards.
// Handles: headers (##), bold (**), italic (*/_), bullets (- / *), numbered lists.
export const stripMarkdown = (text: string | null | undefined): string => {
    if (!text) return '';
    return text
        .replace(/#{1,6}\s+/g, '')        // Remove ## headers
        .replace(/\*\*(.+?)\*\*/g, '$1')  // **bold** -> bold
        .replace(/\*(.+?)\*/g, '$1')       // *italic* -> italic
        .replace(/__(.+?)__/g, '$1')       // __bold__
        .replace(/_(.+?)_/g, '$1')         // _italic_
        .replace(/^\s*[-*]\s+/gm, '')      // Remove bullet markers
        .replace(/^\s*\d+\.\s+/gm, '')     // Remove numbered list markers
        .replace(/\n{2,}/g, ' ')           // Collapse blank lines
        .replace(/\n/g, ' ')               // Replace single newlines with space
        .trim();
};
