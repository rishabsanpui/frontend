import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomePageComponentComponent } from './home-page-component/home-page-component.component';
import { MeetingRoomComponent } from './meeting-room/meeting-room.component';

const routes: Routes = [
  { path: '', component: HomePageComponentComponent }, 
  { path: 'meeting-room', component: MeetingRoomComponent } 
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
