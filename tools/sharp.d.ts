// `sharp` is installed only when the icon is redrawn (`npm i --no-save sharp`), so the project does not depend on it. This declares the part
// of its API that tools/build-brand.ts uses.
declare module 'sharp' {
    interface Sharp {
        resize(width: number, height: number): Sharp;
        png(): Sharp;
        ensureAlpha(): Sharp;
        raw(): Sharp;
        toBuffer(): Promise<Buffer>;
        toBuffer(options: {resolveWithObject: true}): Promise<{data: Buffer; info: {width: number; height: number; channels: number}}>;
    }
    export default function sharp(input: Buffer, options?: {density?: number}): Sharp;
}
