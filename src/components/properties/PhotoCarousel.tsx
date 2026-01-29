'use client';

import * as React from 'react';
import Image from 'next/image';
import { Card, CardContent } from "@/components/ui/card"
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselNext,
    CarouselPrevious,
} from "@/components/ui/carousel"
import { Badge } from '@/components/ui/badge';
import { Camera } from 'lucide-react';

interface PhotoCarouselProps {
    photos: { url: string; caption: string | null }[];
}

export function PhotoCarousel({ photos }: PhotoCarouselProps) {
    const [current, setCurrent] = React.useState(0);
    const [count, setCount] = React.useState(0);

    React.useEffect(() => {
        setCount(photos.length);
    }, [photos]);

    if (!photos.length) {
        return (
            <div className="w-full h-[400px] bg-muted/30 rounded-xl flex items-center justify-center">
                <div className="flex flex-col items-center text-muted-foreground opacity-50">
                    <Camera className="w-12 h-12 mb-2" />
                    <p>No photos available</p>
                </div>
            </div>
        );
    }

    return (
        <div className="relative group">
            <Carousel setApi={(api) => {
                if (!api) return;
                api.on("select", () => {
                    setCurrent(api.selectedScrollSnap());
                });
            }} className="w-full">
                <CarouselContent>
                    {photos.map((photo, index) => (
                        <CarouselItem key={index}>
                            <div className="relative w-full h-[300px] sm:h-[500px] rounded-xl overflow-hidden bg-black/5">
                                <Image
                                    src={photo.url}
                                    alt={photo.caption || `Property photo ${index + 1}`}
                                    fill
                                    className="object-cover"
                                    priority={index === 0}
                                />
                            </div>
                        </CarouselItem>
                    ))}
                </CarouselContent>
                <CarouselPrevious className="left-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                <CarouselNext className="right-4 opacity-0 group-hover:opacity-100 transition-opacity" />
            </Carousel>

            <div className="absolute bottom-4 right-4 z-10">
                <Badge variant="secondary" className="bg-black/50 text-white backdrop-blur-md border-0">
                    <Camera className="w-3 h-3 mr-1" />
                    {current + 1} / {count}
                </Badge>
            </div>
        </div>
    );
}
