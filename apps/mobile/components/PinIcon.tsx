import React from 'react';
import { PushPin, Heart, Star, Bookmark, Lightning, IconProps } from 'phosphor-react-native';
import { useAuth } from '../lib/auth';

interface PinIconProps extends IconProps {
    style?: any;
}

export const PinIcon = ({ size = 16, color, weight = "fill", style, ...props }: PinIconProps) => {
    const { profile } = useAuth();
    const pinStyle = profile?.pin_style || 'pin';

    const renderIcon = () => {
        switch (pinStyle) {
            case 'heart':
                return <Heart size={size} color={color} weight={weight} style={style} {...props} />;
            case 'star':
                return <Star size={size} color={color} weight={weight} style={style} {...props} />;
            case 'bookmark':
                return <Bookmark size={size} color={color} weight={weight} style={style} {...props} />;
            case 'lightning':
                return <Lightning size={size} color={color} weight={weight} style={style} {...props} />;
            case 'pin':
            default:
                return <PushPin size={size} color={color} weight={weight} style={style} {...props} />;
        }
    };

    return renderIcon();
};

export default PinIcon;
