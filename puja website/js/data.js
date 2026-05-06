const mockProducts = [
    {
        id: 1,
        name: "Pure Cow Ghee Diya (Set of 50)",
        localName: "శుద్ధమైన ఆవు నెయ్యి దీపాలు",
        price: 299,
        originalPrice: 350,
        category: "Diyas & Lamps",
        image: "images/ghee_diyas_1777626123228.png",
        rating: 4.8,
        reviews: 124,
        isBestSeller: true,
        description: "Ready-to-use pure cow ghee diyas with cotton wick. Perfect for daily puja and aarti. Burns for 30 minutes seamlessly."
    },
    {
        id: 2,
        name: "Premium Sandalwood Agarbatti",
        localName: "శ్రీ గంధం అగరబత్తి",
        price: 150,
        originalPrice: 180,
        category: "Agarbatti & Dhoop",
        image: "images/sandalwood_agarbatti_1777626138905.png",
        rating: 4.6,
        reviews: 89,
        isBestSeller: true,
        description: "Hand-rolled premium sandalwood incense sticks with low smoke and long-lasting divine fragrance."
    },
    {
        id: 3,
        name: "Complete Satyanarayana Puja Kit",
        localName: "సత్యనారాయణ స్వామి పూజా సామగ్రి",
        price: 1250,
        originalPrice: 1500,
        category: "Puja Kits",
        image: "images/satyanarayana_kit_1777626174464.png",
        rating: 4.9,
        reviews: 310,
        isBestSeller: true,
        description: "Everything you need for Sri Satyanarayana Vratam in one box. Contains 40+ authentic items including Haldi, Kumkum, Navadhanya, and more."
    },
    {
        id: 4,
        name: "Pure Brass Kamatchi Amman Lamp",
        localName: "కామాక్షి అమ్మవారి దీపం",
        price: 850,
        originalPrice: 999,
        category: "Diyas & Lamps",
        image: "images/kamatchi_lamp_1777626266789.png",
        rating: 4.7,
        reviews: 45,
        isBestSeller: false,
        description: "Heavy quality pure brass Kamatchi lamp. Traditional design to bring prosperity to your home."
    },
    {
        id: 5,
        name: "Organic Kumkum & Turmeric Set",
        localName: "పసుపు కుంకుమ",
        price: 120,
        originalPrice: 150,
        category: "Kumkum, Haldi, Chandan",
        image: "images/kumkum_turmeric_1777626281988.png",
        rating: 4.5,
        reviews: 210,
        isBestSeller: true,
        description: "Chemical-free, skin-friendly pure turmeric and kumkum made organically for temple and home use."
    },
    {
        id: 6,
        name: "Ganga Jal (Holy Water) - 500ml",
        localName: "గంగా జలం",
        price: 99,
        originalPrice: 120,
        category: "Daily Puja Items",
        image: "images/satyanarayana_kit_1777626174464.png",
        rating: 4.8,
        reviews: 512,
        isBestSeller: false,
        description: "100% pure Gangajal collected directly from Gangotri. Specially packed to maintain purity."
    }
];

const categories = [
    { name: "Daily Puja Items", icon: "🙏" },
    { name: "Agarbatti & Dhoop", icon: "💨" },
    { name: "Kumkum & Haldi", icon: "🔴" },
    { name: "Diyas & Lamps", icon: "🪔" },
    { name: "Festival Specials", icon: "✨" },
    { name: "Temple Essentials", icon: "🛕" },
    { name: "Puja Kits", icon: "📦" }
];

// Helper to format currency
const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
    }).format(amount);
};

// Database Seeding Script
// Run seedDatabase() in the browser console ONCE to populate your Firestore
async function seedDatabase() {
    if (!window.db) {
        console.error("Firebase DB is not initialized. Check your firebase-config.js");
        return;
    }
    
    console.log("Starting database seed...");
    try {
        for (const product of mockProducts) {
            // Using ID as the document ID for consistency
            await db.collection('products').doc(product.id.toString()).set(product);
            console.log(`Added ${product.name}`);
        }
        console.log("Database successfully seeded!");
        alert("Products added to Firebase!");
    } catch (error) {
        console.error("Error seeding database:", error);
        alert("Error seeding database: " + error.message);
    }
}
