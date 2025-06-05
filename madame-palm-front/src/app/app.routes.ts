import { Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { ReadingComponent } from './reading/reading.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'read-hand', component: ReadingComponent }
];
