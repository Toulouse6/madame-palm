import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { PalmReadingService } from '../services/palm-reading.service';
import { PalmReadingResponse } from '../models/reading.model';
import { NgIf } from '@angular/common';

@Component({
    selector: 'app-home',
    standalone: true,
    imports: [NgIf],
    templateUrl: './home.component.html',
    styleUrls: ['./home.component.css']
})

export class HomeComponent implements OnInit {

    selectedFile: File | null = null;
    previewUrl: string | null = null;
    isLoading = true;
    errorMessage: string | null = null;

    private backgroundAudio = new Audio('assets/audio/realm-of-fairy.mp3');
    private spinnerAudio = new Audio('assets/audio/invisibility-spell.mp3');

    constructor(
        private router: Router,
        private palmReadingService: PalmReadingService
    ) { }

    ngOnInit() {
        this.backgroundAudio.currentTime = 0;
        this.backgroundAudio.loop = true;
        this.backgroundAudio.volume = 0.4;

        this.spinnerAudio.loop = true;
        this.spinnerAudio.volume = 0.8;

        this.backgroundAudio.play().catch(() => {
            document.body.addEventListener('click', () => {
                this.playBackgroundAudio();
            }, { once: true });
        });
    }

    // Background Audio
    private playBackgroundAudio(): void {
        if (this.backgroundAudio.paused) {
            this.backgroundAudio.play().catch(err => {
                console.warn('Background audio failed to play.', err);
            });
        }
    }

    // On file select
    onFileSelected(event: Event): void {
        const file = (event.target as HTMLInputElement).files?.[0];
        this.errorMessage = null;

        if (!file) return;

        this.playBackgroundAudio();

        this.selectedFile = file;

        const reader = new FileReader();
        reader.onload = () => {
            this.previewUrl = reader.result as string;

            setTimeout(() => {
                this.submit();
            }, 1000);
        };
        reader.readAsDataURL(file);
    }

    // User Submit 
    submit(): void {

        // No file
        if (!this.selectedFile) {
            alert('Let your palm be seen, my dear.');
            return;
        }

        // Loading & spinner
        this.isLoading = true;
        this.fadeBackgroundDuringLoading();

        this.spinnerAudio.currentTime = 0;
        this.spinnerAudio.play();

        this.palmReadingService.getPalmReading(this.selectedFile).subscribe({
            next: (response: PalmReadingResponse) => {
                const reading = response?.reading;

                setTimeout(() => {
                    this.restoreBackgroundAfterLoading();
                    this.spinnerAudio.pause();
                    this.isLoading = false;

                    // Bad photo
                    if (response?.readingWarning) {
                        const issue = response.readingIssueType;

                        switch (issue) {
                            case 'blur':
                                this.errorMessage = 'Please provide a clearer photo.';
                                this.selectedFile = null;
                                this.previewUrl = null;
                                return;

                            case 'partial':
                                this.errorMessage = 'Please show your entire palm.';
                                this.selectedFile = null;
                                this.previewUrl = null;
                                return;

                            case 'fallback':
                            default:
                                this.router.navigate(['/read-hand'], {
                                    state: {
                                        reading: response.reading,
                                        cost: response.cost,
                                        triggerVideo: true
                                    }
                                });
                                return;
                        }
                    }
                    // Redirect to /read-hand
                    this.router.navigate(['/read-hand'], { state: response });

                }, 1000);
            },
            // API Error
            error: (err) => {
                this.isLoading = false;
                this.spinnerAudio.pause();
                this.errorMessage = 'Something went wrong...';
                console.error('API error:', err);
            }
        });
    }

    // Background Music fade / restore
    private fadeBackgroundDuringLoading() {
        this.backgroundAudio.volume = 0.2;
    }

    private restoreBackgroundAfterLoading() {
        this.backgroundAudio.volume = 0.2;
        this.backgroundAudio.currentTime = 17.5;

        // Audio fade in
        const targetVolume = 0.8;
        const step = 0.05;
        const interval = setInterval(() => {
            if (this.backgroundAudio.volume < targetVolume) {
                this.backgroundAudio.volume = Math.min(this.backgroundAudio.volume + step, targetVolume);
            } else {
                clearInterval(interval);
            }
        }, 60);
    }


}