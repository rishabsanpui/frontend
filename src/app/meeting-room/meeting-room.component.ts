import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-meeting-room',
  templateUrl: './meeting-room.component.html',
  styleUrls: ['./meeting-room.component.css']
})
export class MeetingRoomComponent implements OnInit {
  meetingId: string = '';
  participantName: string = '';
  peerConnection!: RTCPeerConnection;
  localStream!: MediaStream;
  isVideoOn: boolean = false;
  signalingSocket!: WebSocket;

  @ViewChild('localVideo') localVideo!: ElementRef<HTMLVideoElement>;
  @ViewChild('remoteVideo') remoteVideo!: ElementRef<HTMLVideoElement>;

  constructor(private route: ActivatedRoute, private http: HttpClient) {}

  ngOnInit(): void {
    this.meetingId = this.route.snapshot.paramMap.get('id') || '';
    this.participantName = this.route.snapshot.paramMap.get('participantName') || '';

    this.initializeWebSocketConnection();
    this.initializePeerConnection();
  }

  // WebSocket connection to Spring Boot
  initializeWebSocketConnection() {
    this.signalingSocket = new WebSocket('ws://localhost:8080/ws');


    this.signalingSocket.onopen = () => {
      console.log('WebSocket connection established.');
    };

    this.signalingSocket.onerror = (error) => {
      console.error('WebSocket connection error: ', error);
      this.reconnectWebSocket();
    };

    this.signalingSocket.onmessage = (message) => {
      const data = JSON.parse(message.data);
      this.handleSignalingData(data);
    };
  }

  reconnectWebSocket() {
    console.log('Attempting to reconnect WebSocket...');
    setTimeout(() => {
      this.initializeWebSocketConnection();
    }, 5000); // Retry every 5 seconds
  }

  // Handle incoming signaling data from WebSocket
  handleSignalingData(data: any) {
    switch (data.type) {
      case 'offer':
        this.handleOffer(data.data);
        break;
      case 'answer':
        this.handleAnswer(data.data);
        break;
      case 'candidate':
        this.handleRemoteCandidate(data.data);
        break;
      default:
        console.error('Unknown signaling data type:', data.type);
    }
  }

  initializePeerConnection() {
    const config: RTCConfiguration = {
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    };

    this.peerConnection = new RTCPeerConnection(config);

    // Handle ICE candidates
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendSignalingData('candidate', event.candidate);
        console.log('Sent ICE candidate:', event.candidate);
      }
    };

    // Attach remote stream to the video element
    this.peerConnection.ontrack = (event) => {
      if (this.remoteVideo.nativeElement.srcObject !== event.streams[0]) {
        this.remoteVideo.nativeElement.srcObject = event.streams[0];
        console.log('Remote stream attached to video element');
      }
    };

    this.joinMeeting();
  }

  joinMeeting() {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then((stream) => {
        this.localStream = stream;
        this.isVideoOn = true;
        this.attachLocalStream();
        this.addLocalTracksToPeerConnection();

        // Notify server about joining
        this.http.post('http://localhost:8080/api/video-call/join', {
          sessionId: this.meetingId,
          participant: this.participantName
        }).subscribe(() => {
          console.log('Joined meeting');
        }, (error) => {
          console.error('Error joining meeting:', error);
        });
      })
      .catch((error) => {
        console.error('Error accessing media devices:', error);
      });
  }

  attachLocalStream() {
    if (this.localStream && this.localVideo) {
      this.localVideo.nativeElement.srcObject = this.localStream;
      console.log('Local stream attached to video element');
    } else {
      console.error('Local video element or stream is not available');
    }
  }

  addLocalTracksToPeerConnection() {
    this.localStream.getTracks().forEach(track => {
      if (this.peerConnection.signalingState !== 'closed') {
        this.peerConnection.addTrack(track, this.localStream);
        console.log('Added track:', track);
      } else {
        console.error('Peer connection is closed. Cannot add tracks.');
      }
    });
  }

  handleOffer(offer: RTCSessionDescriptionInit) {
    this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer))
      .then(() => this.peerConnection.createAnswer())
      .then((answer) => {
        this.peerConnection.setLocalDescription(answer);
        this.sendSignalingData('answer', answer);
        console.log('Sent answer:', answer);
      })
      .catch(error => {
        console.error('Error handling offer:', error);
      });
  }

  handleAnswer(answer: RTCSessionDescriptionInit) {
    this.peerConnection.setRemoteDescription(answer)
      .then(() => {
        console.log('Remote Description set successfully');
      })
      .catch(error => {
        console.error('Error setting remote description:', error);
      });
  }

  handleRemoteCandidate(candidate: RTCIceCandidateInit) {
    this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate))
      .then(() => {
        console.log('Remote ICE candidate added successfully');
      })
      .catch(error => {
        console.error('Error adding remote ICE candidate:', error);
      });
  }

  sendSignalingData(type: string, data: any) {
    const signalingData = { type, data };
    this.signalingSocket.send(JSON.stringify(signalingData));
    console.log(`${type} signaling data sent to WebSocket server:`, data);
  }

  toggleMute() {
    const audioTracks = this.localStream.getAudioTracks();
    if (audioTracks.length > 0) {
      audioTracks[0].enabled = !audioTracks[0].enabled;
      console.log(audioTracks[0].enabled ? 'Unmuted' : 'Muted');
    }
  }

  toggleVideo() {
    if (this.isVideoOn) {
      this.stopVideo();
    } else {
      this.startVideo();
    }
  }

  startVideo() {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then((stream) => {
        this.localStream = stream;
        this.isVideoOn = true;
        this.attachLocalStream();
        this.addLocalTracksToPeerConnection();
      })
      .catch((error) => {
        console.error('Error accessing media devices:', error);
      });
  }

  stopVideo() {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.isVideoOn = false;
      console.log('Video stream stopped');
    }
  }
}
