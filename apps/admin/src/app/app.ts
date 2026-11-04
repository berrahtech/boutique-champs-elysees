import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Session } from '@lce/session';

@Component({
  selector: 'lce-root',
  imports: [RouterOutlet],
  template: '<router-outlet />',
})
export class App {
  constructor() {
    void inject(Session).reprendre();
  }
}
