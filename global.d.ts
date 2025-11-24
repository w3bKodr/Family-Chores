/// <reference types="nativewind/types" />

import type { ComponentType, ComponentProps } from 'react';

declare module 'nativewind' {
	export function styled<Component extends ComponentType<any>>(
		component: Component
	): ComponentType<ComponentProps<Component> & { className?: string }>;
}
