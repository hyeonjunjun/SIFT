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
