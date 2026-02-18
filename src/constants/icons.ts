export type IconKey = 
    | 'coffee'
    | 'water'
    | 'strawberry'
    | 'leaf'
    | 'default';

export const ICONS: Record<IconKey, any> = {
    coffee: require('@/assets/icons/ingredients/coffee.png'),
    water: require('@/assets/icons/ingredients/water.png'),
    strawberry: require('@/assets/icons/ingredients/strawberry.png'),
    leaf: require('@/assets/icons/ingredients/matcha.png'),
    default: require('@/assets/icons/ingredients/default.png'),
}