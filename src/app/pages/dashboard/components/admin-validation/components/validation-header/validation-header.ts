import { Component, input } from '@angular/core';

@Component({
  selector: 'app-validation-header',
  standalone: true,
  templateUrl: './validation-header.html'
})
export class ValidationHeader {
  cameraActive = input<boolean>(false);
}
