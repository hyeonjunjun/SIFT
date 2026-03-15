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
const DOMAIN_TAG_MAP: Record<string, string> = {
    // Video
    'youtube.com': 'Video',
    'youtu.be': 'Video',
    'vimeo.com': 'Video',
    'tiktok.com': 'Video',
    'twitch.tv': 'Video',
    // Social
    'twitter.com': 'Social',
    'x.com': 'Social',
    'instagram.com': 'Social',
    'facebook.com': 'Social',
    'threads.net': 'Social',
    'reddit.com': 'Social',
    'linkedin.com': 'Social',
    'bsky.app': 'Social',
    // News
    'nytimes.com': 'News',
    'washingtonpost.com': 'News',
    'theguardian.com': 'News',
    'bbc.com': 'News',
    'bbc.co.uk': 'News',
    'cnn.com': 'News',
    'reuters.com': 'News',
    'apnews.com': 'News',
    'bloomberg.com': 'News',
    // Tech
    'techcrunch.com': 'Tech',
    'theverge.com': 'Tech',
    'arstechnica.com': 'Tech',
    'wired.com': 'Tech',
    'hackernews.com': 'Tech',
    'news.ycombinator.com': 'Tech',
    // Research
    'arxiv.org': 'Research',
    'scholar.google.com': 'Research',
    'nature.com': 'Research',
    'science.org': 'Research',
    'pubmed.ncbi.nlm.nih.gov': 'Research',
    // Dev
    'github.com': 'Dev',
    'stackoverflow.com': 'Dev',
    'dev.to': 'Dev',
    'medium.com': 'Article',
    'substack.com': 'Article',
    // Shopping
    'amazon.com': 'Shopping',
    'ebay.com': 'Shopping',
    'etsy.com': 'Shopping',
    // Food
    'allrecipes.com': 'Recipe',
    'seriouseats.com': 'Recipe',
    'bonappetit.com': 'Recipe',
    // Music
    'spotify.com': 'Music',
    'open.spotify.com': 'Music',
    'soundcloud.com': 'Music',
    'music.apple.com': 'Music',
    // Travel
    'tripadvisor.com': 'Travel',
    'airbnb.com': 'Travel',
    'booking.com': 'Travel',
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
