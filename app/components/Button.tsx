import React from 'react';
import { ActivityIndicator, Text, TextStyle, TouchableOpacity, ViewStyle } from 'react-native';

interface ButtonProps {
    text: string;
    onPress: () => void;
    variant?: 'primary' | 'secondary' | 'light' | 'dark' | 'outline';
    size?: 'small' | 'medium' | 'large';
    disabled?: boolean;
    loading?: boolean;
    fullWidth?: boolean;
    customStyle?: ViewStyle;
    textStyle?: TextStyle;
    icon?: React.ReactNode;
    iconPosition?: 'left' | 'right';
}

export default function Button({
    text,
    onPress,
    variant = 'primary',
    size = 'medium',
    disabled = false,
    loading = false,
    fullWidth = false,
    customStyle,
    textStyle,
    icon,
    iconPosition = 'left',
}: ButtonProps) {
    // Get button styles based on variant
    const getVariantStyles = (): string => {
        const baseStyles = 'rounded-lg items-center justify-center flex-row';

        switch (variant) {
            case 'primary':
                return `${baseStyles} bg-primary`;
            case 'secondary':
                return `${baseStyles} bg-secondary-50`;
            case 'light':
                return `${baseStyles} bg-light-50`;
            case 'dark':
                return `${baseStyles} bg-dark`;
            case 'outline':
                return `${baseStyles} border-2 border-primary bg-transparent`;
            default:
                return `${baseStyles} bg-primary`;
        }
    };

    // Get size styles
    const getSizeStyles = (): string => {
        switch (size) {
            case 'small':
                return 'px-4 py-2';
            case 'medium':
                return 'px-6 py-3';
            case 'large':
                return 'px-8 py-4';
            default:
                return 'px-6 py-3';
        }
    };

    // Get text color based on variant
    const getTextColor = (): string => {
        if (variant === 'outline') {
            return 'text-primary';
        }
        if (variant === 'light') {
            return 'text-dark';
        }
        return 'text-white';
    };

    // Get text size based on button size
    const getTextSize = (): string => {
        switch (size) {
            case 'small':
                return 'text-sm';
            case 'medium':
                return 'text-base';
            case 'large':
                return 'text-lg';
            default:
                return 'text-base';
        }
    };

    const buttonClasses = `
    ${getVariantStyles()}
    ${getSizeStyles()}
    ${fullWidth ? 'w-full' : ''}
    ${disabled ? 'opacity-50' : ''}
  `;

    const textClasses = `
    ${getTextColor()}
    ${getTextSize()}
    font-semibold
    ${icon ? 'mx-2' : ''}
  `;

    return (
        <TouchableOpacity
            className={buttonClasses}
            style={customStyle}
            onPress={onPress}
            disabled={disabled || loading}
            activeOpacity={0.7}
        >
            {loading ? (
                <ActivityIndicator
                    color={variant === 'outline' || variant === 'light' ? '#42A4F5' : '#FFFFFF'}
                />
            ) : (
                <>
                    {icon && iconPosition === 'left' && icon}
                    <Text className={textClasses} style={textStyle}>
                        {text}
                    </Text>
                    {icon && iconPosition === 'right' && icon}
                </>
            )}
        </TouchableOpacity>
    );
}
