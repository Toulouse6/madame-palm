import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, EMPTY } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { PalmReadingResponse, ReadingIssueType, PalmReadingRequest } from '../models/reading.model';

@Injectable({
    providedIn: 'root'
})
export class PalmReadingService {

    private apiUrl = environment.apiUrl;

    constructor(private http: HttpClient) { }

    // Get Reading
    getPalmReading(image: File): Observable<PalmReadingResponse> {
        return new Observable(observer => {
            const reader = new FileReader();

            // Handle image file
            reader.onload = () => {
                const base64 = (reader.result as string)?.split(',')[1] || '';
                const mimeType = image.type || 'image/jpeg';

                if (!base64.trim()) {
                    console.warn('No base64. Using fallback.');
                    this.loadFallbackReading(observer, true);
                    return;
                }

                const payload: PalmReadingRequest = { base64, mimeType };
                const headers = new HttpHeaders({ 'Content-Type': 'application/json' });

                this.http.post<{ reading: string; cost?: string }>(this.apiUrl, payload, { headers }).pipe(
                    catchError(err => {
                        console.warn('API failed. Using fallback.', err);
                        this.loadFallbackReading(observer, true);
                        return EMPTY;
                    })
                ).subscribe({
                    // Next
                    next: (response) => {
                        const reading = (response?.reading || '').trim();
                        const cost = response.cost;
                        const lowered = reading.toLowerCase();

                        console.log("API Connecting...");

                        // Console GPT Cost
                        if (cost) {
                            console.log(`GPT Cost: $${parseFloat(cost).toFixed(6)}`);
                        }
                        console.log("Response preview:", reading.split(/\s+/).slice(0, 10).join(' ') + '...');

                        const isFallback = this.isFallbackResponse(lowered, reading);
                        const readingIssueType = this.getReadingIssueType(lowered);
                        const hasReadingIssue = !!readingIssueType;

                        if (isFallback || !readingIssueType || readingIssueType === 'fallback') {
                            console.warn("Fallback response 𓂀");
                            this.loadFallbackReading(observer, true);
                            return;
                        } else {
                            observer.next({
                                reading,
                                readingWarning: hasReadingIssue,
                                readingIssueType,
                                cost
                            });

                            if (!hasReadingIssue) {
                                console.info("🍀 Palm reading received successfully.");
                            }

                            observer.complete();
                        }
                    },
                    // Error reading, using Fallback
                    error: (err) => {
                        console.warn('API error. Using fallback.', err);
                        this.loadFallbackReading(observer, true);
                    }
                });
            };

            reader.onerror = err => {
                console.warn('Reading failed. Using fallback.', err);
                this.loadFallbackReading(observer, true);
            };

            reader.readAsDataURL(image);
        });
    }

    private isFallbackResponse(lowered: string, original: string): boolean {
        return lowered.length < 30 || original.includes('I cannot interpret');
    }

    // Reading issue:
    private getReadingIssueType(lowered: string): ReadingIssueType {

        // Blur hand indicators:
        const blurIndicators = [
            "ambiguous image", "appears incomplete", "blurry", "couldn't identify", "couldn’t identify",
            "couldn't find", "couldn’t find", "difficult to", "doesn't look", "doesn’t look",
            "hand not clearly shown", "hard to", "image is", "image quality", "indistinct shape", "it looks",
            "it seems", "low resolution", "might not", "no hand", "no palm",
            "not enough light", "not sure", "not visible", "partially visible",
            "poor image", "this is not", "this isn't", "this isn’t", "too dark", "uncertain object",
            "dark shadows", "glare", "lack of detail", "light reflections", "low contrast",
            "not clear enough", "overexposed", "underexposed", "unreadable", "washed out"
        ];

        // Partial hand indicators:
        const partialHandIndicators = [
            "partially visible", "hand not fully shown", "incomplete", "obstructed",
            "cut off", "fingers missing", "palm not fully visible", "cannot see all fingers",
            "edge of hand", "hand cut off", "just a portion", "missing parts", "not fully displayed",
            "only part of", "palm is cropped"
        ];

        // API failure / other
        const fallbackIndicators = [
            "i can't read", "i can’t read", "i can't see", "i can’t see",
            "analysis failed", "cannot analyze", "cannot provide", "could not",
            "i am", "i’m", "i apologize", "i cannot", "i can’t",
            "i can't", "i can’t", "i do", "i don’t", "i don't", "i’ve", "i've",
            "i have", "i’ve", "i lack", "i'm not", "i’m not", "i'm sorry", "i’m sorry",
            "i'm unable", "i’m unable", "i'm unsure", "i’m unsure",
            "no information", "not able", "unable to", "sorry, i", "not enough context",
            "can't draw a conclusion", "can’t draw a conclusion",
            "i can't tell from this", "i can’t tell from this",
            "i do not have enough data", "i don't see anything useful", "i don’t see anything useful",
            "i'm having trouble with this", "i’m having trouble with this",
            "i'm not confident", "i’m not confident",
            "insufficient information", "my response might not be accurate", "the input is unclear",
            "this goes beyond my abilities"
        ];

        if (blurIndicators.some(i => lowered.includes(i))) return 'blur';
        if (partialHandIndicators.some(i => lowered.includes(i))) return 'partial';
        if (fallbackIndicators.some(i => lowered.includes(i))) return 'fallback';
        return null;
    }

    // Load Fallback 
    private loadFallbackReading(observer: any, isFallback: boolean = false) {
        console.warn("Using local fallback...");

        this.http.get<{ reading: string }>('assets/fallback.json').subscribe({
            next: (data) => {
                if (data?.reading) {
                    if (isFallback) {
                        console.warn("API failure or image issues.");
                    } else {
                        console.info("Fallback loaded successfully!");
                    }

                    observer.next({
                        reading: data.reading,
                        readingWarning: isFallback,
                        readingIssueType: isFallback ? 'fallback' : null
                    });
                    observer.complete();
                } else {
                    console.error("Fallback JSON unavailable.");
                    observer.error("Fallback JSON invalid.");
                }
            },
            // Error loading Fallback 
            error: (err) => {
                console.error("Failed to load fallback.json:", err);
                observer.error("Fallback load failed.");
            }
        });
    }
}