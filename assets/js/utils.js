export const money = value => "Br " + Number(value || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
export const escapeHtml = value => String(value ?? "").replace(/[&<>'"]/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[char]));

// Performance-optimized image loader helper
const getImg = (id, fallback) => {
  // Using high-performance Unsplash URLs for common burger/food items
  const unsplashIds = {
    "classic-yoni": "sc5sTPMrVfk",
    "double-cheese": "jh5XyK4Rr3Y",
    "spicy-ethiopian": "L7E7bd7ZfJg",
    "truffle-luxury": "N-q-A_T_H7c",
    "crispy-chicken": "0-M_XJc-Z-U",
    "veggie-delight": "M7449vYf6q8",
    "classic-fries": "k51T5qXqG-k",
    "truffle-fries": "6j_S1n26rW0",
    "onion-rings": "x0oT1z-r-r0",
    "ethiopian-coffee": "UpJXobZtBvaFdQrL",
    "honey-tej": "rulCxpaQvtaOzmoM",
    "craft-beer": "GSGnXICCpeWHqxxj",
    "chocolate-lava": "L-2p8f2VvXw",
    "mango-sorbet": "v-v-v-v-v-v"
  };
  
  if (unsplashIds[id]) {
    return `https://images.unsplash.com/photo-${unsplashIds[id]}?auto=format&fit=crop&w=600&q=70`;
  }
  return fallback;
};

export const fallbackMenu = [
  {id:"classic-yoni", name:"Classic Yoni Burger", nameAm:"ክላሲክ ዮኒ በርገር", description:"Premium beef patty, house-made Yoni sauce, aged cheddar, and caramelized onions on a brioche bun.", price:850, category:"Burgers", dietary:["popular"], image: getImg("classic-yoni", "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=70")},
  {id:"double-cheese", name:"Double Cheese Overload", nameAm:"ደብል ቺዝ በርገር", description:"Two 150g beef patties, triple cheddar, pickles, and smoky mustard.", price:1100, category:"Burgers", dietary:[], image: getImg("double-cheese", "https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?auto=format&fit=crop&w=600&q=70")},
  {id:"spicy-ethiopian", name:"Spicy Ethiopian Twist", nameAm:"ስፓይሲ ኢትዮጵያን ትዊስት", description:"Beef patty infused with berbere spices, jalapeños, and a cool yogurt-lime sauce.", price:920, category:"Burgers", dietary:["spicy"], image: getImg("spicy-ethiopian", "https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=600&q=70")},
  {id:"truffle-luxury", name:"Truffle Luxury Burger", nameAm:"ትረፍል ላክዠሪ በርገር", description:"Black truffle mayo, sautéed wild mushrooms, and swiss cheese.", price:1350, category:"Burgers", dietary:["popular"], image: getImg("truffle-luxury", "https://images.unsplash.com/photo-1596662951482-0c4ba74a6df6?auto=format&fit=crop&w=600&q=70")},
  {id:"crispy-chicken", name:"Yoni Crispy Chicken", nameAm:"ዮኒ ክሪስፒ ቺክን", description:"Buttermilk fried chicken breast, spicy slaw, and honey mustard.", price:880, category:"Burgers", dietary:[], image: getImg("crispy-chicken", "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&w=600&q=70")},
  {id:"veggie-delight", name:"Garden Veggie Burger", nameAm:"የአትክልት በርገር", description:"House-made chickpea and beetroot patty, avocado, and sprouts.", price:750, category:"Burgers", dietary:["vegetarian"], image: getImg("veggie-delight", "https://images.unsplash.com/photo-1520072959219-c595dc870360?auto=format&fit=crop&w=600&q=70")},
  {id:"classic-fries", name:"Golden Sea Salt Fries", nameAm:"ክላሲክ ችፕስ", description:"Hand-cut potatoes, double-fried for maximum crunch.", price:350, category:"Sides", dietary:["popular"], image: getImg("classic-fries", "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=600&q=70")},
  {id:"truffle-fries", name:"Truffle Parmesan Fries", nameAm:"ትረፍል ችፕስ", description:"Tossed in truffle oil and aged parmesan cheese.", price:550, category:"Sides", dietary:["vegetarian"], image: getImg("truffle-fries", "https://images.unsplash.com/photo-1630384060421-cb20d0e0649d?auto=format&fit=crop&w=600&q=70")},
  {id:"onion-rings", name:"Beer-Battered Onion Rings", nameAm:"ኦኒየን ሪንግስ", description:"Giant rings served with a spicy dipping sauce.", price:450, category:"Sides", dietary:["vegetarian"], image: getImg("onion-rings", "https://images.unsplash.com/photo-1639146175554-825f9ff88814?auto=format&fit=crop&w=600&q=70")},
  {id:"ethiopian-coffee", name:"Yoni Craft Coffee", nameAm:"የዮኒ ቡና", description:"Traditional Ethiopian coffee beans, medium roast, served black or with milk.", price:250, category:"Drinks", dietary:[], image: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663887810301/UpJXobZtBvaFdQrL.jpg"},
  {id:"honey-tej", name:"Premium Honey Tej", nameAm:"ፕሪሚየም የማር ጠጅ", description:"Artisanal Ethiopian honey wine, sweet and refreshing.", price:550, category:"Drinks", dietary:[], image: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663887810301/rulCxpaQvtaOzmoM.jpeg"},
  {id:"craft-beer", name:"Local Craft Beer", nameAm:"የሀገር ውስጥ ቢራ", description:"Crisp lager from local Ethiopian breweries.", price:400, category:"Drinks", dietary:[], image: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663887810301/GSGnXICCpeWHqxxj.jpg"},
  {id:"chocolate-lava", name:"Molten Chocolate Lava", nameAm:"ቾኮሌት ላቫ ኬክ", description:"Warm chocolate cake with a gooey center, served with vanilla bean ice cream.", price:650, category:"Dessert", dietary:["popular"], image: "https://images.unsplash.com/photo-1624353335566-31b1d1bc4476?auto=format&fit=crop&w=600&q=70"},
  {id:"mango-sorbet", name:"Tropical Mango Sorbet", nameAm:"ማንጎ ሶርቤት", description:"Refreshing, dairy-free mango sorbet with fresh mint.", price:450, category:"Dessert", dietary:["vegan"], image: "https://images.unsplash.com/photo-1505394033323-424e6221e33d?auto=format&fit=crop&w=600&q=70"}
];
