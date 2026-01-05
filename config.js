// Konfigurasi Website ForexterChat
const CONFIG = {
    // Discord Webhook
    DISCORD_WEBHOOK: 'https://discord.com/api/webhooks/1447218191813316710/5BOwc4MKU9mNeEdDJ6a_gUH6MUBQeVeLh3QKKv1tuAd_1KBi2PtFBwpX-hBXLBJxIal7',
    
    // Admin Credentials
    ADMINS: [
        { username: 'ndii', password: 'ndii123' },
        { username: 'lan', password: 'lanyz123' },
        { username: 'lez', password: 'lez123' },
        { username: 'karin', password: 'karin123' },
        { username: 'kenzz', password: 'kenzz123' },
        { username: 'fanks', password: 'fanks123' }
    ],
    
    // Bot Settings
    BOT: {
        name: 'Forexter Bot',
        version: '1.2.0',
        created: '2026',
        developer: 'NdiiClouD Team'
    },
    
    // Community Settings
    COMMUNITY: {
        name: 'Forexter Network',
        description: 'Komunitas resmi Forexter Network',
        members: 0, // Akan diupdate dinamis
        rules: [
            'Dilarang spam',
            'Hormati semua member',
            'Gunakan bahasa yang sopan',
            'Dilarang beriklan tanpa izin'
        ]
    },
    
    // Website Settings
    SETTINGS: {
        maintenance: false,
        theme: 'dark',
        autoJoin: true,
        allowGuest: true
    },
    
    // TTS Settings
    TTS_TOKOH: {
        jokowi: {
            speed: -30,
            model: "id-ID-ArdiNeural-Male",
            tune: -3
        },
        megawati: {
            speed: -20,
            model: "id-ID-GadisNeural-Female",
            tune: -3
        },
        prabowo: {
            speed: -30,
            model: "id-ID-ArdiNeural-Male",
            tune: -3
        }
    }
};
