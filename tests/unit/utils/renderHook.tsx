import { act } from "react";
import type { ComponentType, PropsWithChildren } from "react";
import { createRoot, type Root } from "react-dom/client";

type WrapperComponent = ComponentType<PropsWithChildren>;

function DefaultWrapper({ children }: PropsWithChildren) {
    return <>{children}</>;
}

export function renderHook<T>(callback: () => T, options?: { wrapper?: WrapperComponent }) {
    const container = document.createElement("div");
    document.body.appendChild(container);

    const result = { current: undefined as T | undefined };
    const wrapper = options?.wrapper ?? DefaultWrapper;
    let root: Root | null = createRoot(container);

    function HookProbe() {
        result.current = callback();
        return null;
    }

    const render = () => {
        if (!root) {
            throw new Error("Hook root has already been unmounted.");
        }

        const Wrapper = wrapper;
        root.render(
            <Wrapper>
                <HookProbe />
            </Wrapper>,
        );
    };

    act(() => {
        render();
    });

    return {
        result: result as { current: T },
        rerender() {
            act(() => {
                render();
            });
        },
        unmount() {
            if (!root) {
                return;
            }

            act(() => {
                root?.unmount();
            });
            root = null;
            container.remove();
        },
    };
}
