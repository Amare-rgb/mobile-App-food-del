import { Category, Restaurant, Food } from '../types/types';

export const CATEGORIES: Category[] = [
  { id: '1', name: 'Burgers', icon: '🍔' },
  { id: '2', name: 'Pizza', icon: '🍕' },
  { id: '3', name: 'Sushi', icon: '🍣' },
  { id: '4', name: 'Drinks', icon: '🥤' },
  { id: '5', name: 'Desserts', icon: '🍰' },
  { id: '6', name: 'Salads', icon: '🥗' },
];

export const RESTAURANTS: Restaurant[] = [
  {
    id: '1',
    name: 'Burger King',
    image: 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=800',
    rating: 4.5,
    deliveryTime: '20-30 min',
    deliveryFee: 150, // ✅ ETB
    distance: '1.2 km',
    category: 'Burgers',
    isOpen: true,
  },
  {
    id: '2',
    name: 'Pizza Hut',
    image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800',
    rating: 4.3,
    deliveryTime: '25-35 min',
    deliveryFee: 200, // ✅ ETB
    distance: '2.1 km',
    category: 'Pizza',
    isOpen: true,
  },
  {
    id: '3',
    name: 'Sushi Master',
    image: 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=800',
    rating: 4.8,
    deliveryTime: '30-40 min',
    deliveryFee: 250, // ✅ ETB
    distance: '3.5 km',
    category: 'Sushi',
    isOpen: true,
  },
];

export const FOODS: Food[] = [
  {
    id: '1',
    restaurantId: '1',
    name: 'Classic Cheeseburger',
    description: 'Juicy beef patty with cheddar cheese, lettuce, tomato',
    price: 450, // ✅ ETB
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800',
    rating: 4.7,
    category: 'Burgers',
    isPopular: true,
  },
  {
    id: '2',
    restaurantId: '1',
    name: 'Double Bacon Burger',
    description: 'Two beef patties, crispy bacon, cheese',
    price: 650, // ✅ ETB
    image: 'https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=800',
    rating: 4.9,
    category: 'Burgers',
    isPopular: true,
  },
  {
    id: '3',
    restaurantId: '2',
    name: 'Pepperoni Pizza',
    description: 'Fresh mozzarella, pepperoni, tomato sauce',
    price: 800, // ✅ ETB
    image: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=800',
    rating: 4.6,
    category: 'Pizza',
  },
  {
    id: '4',
    restaurantId: '2',
    name: 'Margherita Pizza',
    description: 'Classic with tomatoes, mozzarella, basil',
    price: 600, // ✅ ETB
    image: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=800',
    rating: 4.5,
    category: 'Pizza',
  },
  {
    id: '5',
    restaurantId: '3',
    name: 'Salmon Sushi Roll',
    description: 'Fresh salmon, avocado, cucumber',
    price: 950, // ✅ ETB
    image: 'https://images.unsplash.com/photo-1617196034796-73dfa7b1fd56?w=800',
    rating: 4.8,
    category: 'Sushi',
  },
  {
    id: '6',
    restaurantId: '3',
    name: 'Tuna Nigiri',
    description: 'Fresh tuna over seasoned rice',
    price: 550, // ✅ ETB
    image: 'https://images.unsplash.com/photo-1611143669185-af224c5e3252?w=800',
    rating: 4.7,
    category: 'Sushi',
  },
];