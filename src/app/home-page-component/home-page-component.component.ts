import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

@Component({
  selector: 'app-home-page-component',
  templateUrl: './home-page-component.component.html',
  styleUrls: ['./home-page-component.component.css']
})
export class HomePageComponentComponent implements OnInit {

  UUId: string = "";
  meetingCode: string = "";
  participantName: string = "";

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit(): void {}

  startMeeting() {
    this.http.post<{ sessionId: string }>('http://localhost:8080/api/video-call/start?host=HostName', {})
      .subscribe({
        next: (response) => {
          this.UUId = response.sessionId; // Save the session ID
        },
        error: (error) => {
          console.error('Error starting meeting:', error);
          alert('Failed to start the meeting. Please try again later.');
        }
      });
  }

  async joinMeeting() {
    if (this.meetingCode && this.participantName) {
      try {
        const response = await this.http.post<{ sessionId: string }>(
          `http://localhost:8080/api/video-call/join?sessionId=${this.meetingCode}&participant=${this.participantName}`, {}
        ).toPromise();
  
        if (response) {
          this.router.navigate(['/meeting-room', { id: this.meetingCode, participantName: this.participantName }]);
        }
      } catch (error) {
        console.error('Error joining meeting:', error);
      }
    } else {
      alert('Please enter both Meeting Code and Participant Name');
    }
  }
  
  
}
