import { NgIf, NgFor } from '@angular/common';
import { AfterViewInit, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import html2canvas from 'html2canvas';

@Component({
    selector: 'app-reading',
    standalone: true,
    imports: [NgIf, NgFor, RouterLink],
    templateUrl: './reading.component.html',
    styleUrls: ['./reading.component.css']
})
export class ReadingComponent implements OnInit, AfterViewInit {

    @ViewChild('smokeVideo') smokeVideo!: ElementRef<HTMLVideoElement>;

    reading: string = '';
    palmLines: { title: string, content: string }[] = [];
    summary: string = '';
    cost: string | null = null;

    isLoading = true;
    isSharing = false;

    constructor(private router: Router) {
        const nav = this.router.getCurrentNavigation();
        this.reading = nav?.extras.state?.['reading'] || 'No reading available.';
        this.cost = nav?.extras.state?.['cost'] || null;
    }

    ngOnInit() {
        if (this.hasReading) {
            this.parseReading();
        }
        this.isLoading = false;
    }

    // AfterViewInit for smoke effect
    ngAfterViewInit(): void {
        const shouldPlay = history.state?.['triggerVideo'] ?? false;

        if (shouldPlay && this.smokeVideo) {
            const videoEl = this.smokeVideo.nativeElement;
            videoEl.currentTime = 2.5;
            videoEl.play().catch(err => {
                console.warn('Smoke video failed:', err);
            });
        }
    }
    get hasReading(): boolean {
        return !!this.reading && this.reading !== 'No reading available.';
    }

    // Format title
    private formatTitle(title: string): string {
        return `${title} →`;
    }

    // Parse reading
    private parseReading() {
        if (
            this.reading.includes("Heart Line:") &&
            this.reading.includes("Head Line:") &&
            this.reading.includes("Life Line:")
        ) {
            this.parseCombinedReading();
        } else {
            this.parseFormattedReading();
        }
    }

    // Parse cobmined
    private parseCombinedReading() {
        const lines = [
            { key: 'Heart Line', title: '𖥸 Heart Line' },
            { key: 'Head Line', title: '꩜ Head Line' },
            { key: 'Life Line', title: '𖧧 Life Line' }
        ];

        lines.forEach(({ key, title }) => {
            const match = this.reading.match(new RegExp(`${key}:\\s*([^.]+(?:\\.\\s|\\.))`));
            if (match?.[1]) {
                this.palmLines.push({ title, content: match[1].trim() });

                if (key === 'Life Line') {
                    const after = this.reading.substring(this.reading.indexOf(match[0]) + match[0].length).trim();
                    this.summary = after.replace(/^Overall Summary[:\-]?\s*/i, "").trim();
                }
            }
        });
    }

    // format reading body
    private parseFormattedReading() {
        const sections = this.reading.split(/\*\*(.*?)\*\*/g).map(s => s.trim());

        for (let i = 0; i < sections.length - 2; i += 2) {
            const title = sections[i + 1]?.trim().replace(/^[#*_:\s]+|[#*_:\s]+$/g, '') || '';
            const content = sections[i]?.trim().replace(/^[#*_:\s\n\r]+/, '').replace(/^\*+/, '') || '';

            if (this.isMainLine(title) && content) {
                this.palmLines.push({ title: this.getSymbolTitle(title), content });
            }
        }
        // format summary
        const rawSummary = sections.at(-1)?.trim();
        if (rawSummary) {
            this.summary = rawSummary
                .replace(/^[#*_:\s]+/, '')
                .replace(/^Overall Summary[:\-]?\s*/i, '')
                .trim();
        }
    }

    //  Line titles symbols
    private getSymbolTitle(title: string): string {
        const symbols: Record<string, string> = {
            'Heart Line': '𖥸 Heart Line',
            'Head Line': '꩜ Head Line',
            'Life Line': '𖧧 Life Line'
        };
        return symbols[title] || title;
    }

    private isMainLine(title: string): boolean {
        return ['Heart Line', 'Head Line', 'Life Line'].includes(title);
    }

    // Screenshot sharing
    shareReadingScreenshot() {

        if (this.isSharing) return;
        this.isSharing = true;

        const element = document.getElementById('readingContainer');

        if (!element) {
            this.isSharing = false;
            alert('Reading area not found.');
            return;
        }
        // Add screenshot class before capturing
        element.classList.add('screenshot-mode');

        // CANVAS
        html2canvas(element, {
            logging: false,
            backgroundColor: null,
            width: 1080,
            height: 1920,
            scale: 1,
            useCORS: true,
            allowTaint: true,
            onclone: (clonedDoc) => {
                const container = clonedDoc.getElementById('readingContainer');
                if (!container) return;

                // Ensure screenshot mode
                container.classList.add('screenshot-mode');

                // Force dimensions & styling
                const htmlContainer = container as HTMLElement;
                Object.assign(htmlContainer.style, {
                    width: '1080px',
                    height: '1920px',
                    margin: '0',
                    padding: '0',
                    position: 'relative',
                    overflow: 'hidden',
                    boxSizing: 'border-box',
                    background: 'linear-gradient(90deg, rgba(66, 14, 54, 1) 0%, rgba(88, 18, 62, 1) 50%, rgba(66, 14, 54, 1) 100%)'
                })

                // Disable animations / transitions
                const all = container.querySelectorAll('*');
                all.forEach((el) => {
                    const htmlEl = el as HTMLElement;
                    if (htmlEl.style) {
                        htmlEl.style.animation = 'none';
                        htmlEl.style.transition = 'none';
                        htmlEl.style.transform = 'none';
                        htmlEl.style.opacity = '1';
                        htmlEl.style.visibility = 'visible';
                    }
                });
            }
        }).then(canvas => {
            // Remove screenshot mode
            element.classList.remove('screenshot-mode');

            canvas.toBlob(blob => {
                if (!blob) {
                    this.isSharing = false;
                    return;
                }

                const file = new File([blob], 'my-palm-reading-story.png', { type: 'image/png' });

                if (navigator.canShare?.({ files: [file] })) {
                    navigator.share({
                        title: 'My Palm Reading by the Madame',
                        files: [file],
                        text: 'Check out my palm reading!'
                    }).catch(() => { }).finally(() => this.isSharing = false);
                } else {
                    const link = document.createElement('a');
                    link.href = URL.createObjectURL(blob);
                    link.download = 'my-palm-reading-story.png';
                    link.click();
                    this.isSharing = false;
                }
            }, 'image/png', 0.95);
        }).catch(err => {
            // Remove screenshot mode on error
            element.classList.remove('screenshot-mode');
            console.error('Screenshot error:', err);
            this.isSharing = false;
        });
    }

    // Copy to Clipboard
    copyToClipboard() {
        const text = this.getReadingText();

        navigator.clipboard.writeText(text)
            .then(() => console.info('Reading copied.'))
            .catch(err => console.error('Copy failed:', err));
    }

    private getReadingText(): string {
        const footer = `\nMadame Palm.\n---\nTry yours:\nhttps://madame-palm.web.app/`;

        const linesText = this.palmLines.length
            ? this.palmLines.map(line =>
                `${this.formatTitle(line.title)}\n${line.content.trim()}`
            ).join('\n\n')
            : 'No palm lines detected.';

        return `My reading by the Madame:\n\n${linesText}\n\nSummary:\n${this.summary || 'No summary available.'}\n${footer}`.trim();
    }
}
