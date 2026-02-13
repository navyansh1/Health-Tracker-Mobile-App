import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import {
    LayoutGrid,
    Coffee,
    Utensils,
    Pizza,
    IceCream
} from 'lucide-react-native';

const ICON_MAP = {
    LayoutGrid: LayoutGrid,
    Coffee: Coffee,
    Utensils: Utensils,
    Pizza: Pizza,
    IceCream: IceCream,
};

const CategoryFilter = ({ activeCategory, onCategoryPress, categories, themeColors }) => {
    return (
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.container}
            contentContainerStyle={styles.contentContainer}
        >
            {categories.map((cat) => {
                const isSelected = activeCategory === cat.value;
                const IconComponent = ICON_MAP[cat.icon] || LayoutGrid;
                const color = cat.color || themeColors.primary;

                return (
                    <TouchableOpacity
                        key={cat.value}
                        onPress={() => onCategoryPress(cat.value)}
                        style={styles.item}
                        activeOpacity={0.7}
                    >
                        <View style={[
                            styles.iconWrapper,
                            {
                                backgroundColor: `${color}20`, // 20% opacity for background
                                borderColor: isSelected ? color : 'transparent',
                                borderWidth: 2,
                            }
                        ]}>
                            <IconComponent size={22} color={color} />
                        </View>
                        <Text style={[
                            styles.label,
                            {
                                color: themeColors.text,
                                fontWeight: isSelected ? '700' : '500'
                            }
                        ]}>
                            {cat.label}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        maxHeight: 100,
        marginTop: 12,
        marginBottom: 8,
    },
    contentContainer: {
        paddingHorizontal: 16, // increased from 4 to match date row
        gap: 12,
        flexGrow: 1,
        justifyContent: 'center',
    },
    item: {
        alignItems: 'center',
        width: 56,
    },
    iconWrapper: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 6,
    },
    label: {
        fontSize: 12,
        textAlign: 'center',
    },
});

export default CategoryFilter;
