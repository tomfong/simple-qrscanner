import { Component, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { ScreenOrientation } from '@awesome-cordova-plugins/screen-orientation/ngx';
import { SocialSharing } from '@awesome-cordova-plugins/social-sharing/ngx';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Toast } from '@capacitor/toast';
import { LoadingController, ModalController, Platform } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { NgxQrcodeElementTypes, NgxQrcodeErrorCorrectionLevels, QrcodeComponent } from '@techiediaries/ngx-qrcode';
import { EnvService } from 'src/app/services/env.service';

@Component({
  selector: 'app-qr-code',
  templateUrl: './qr-code.component.html',
  styleUrls: ['./qr-code.component.scss'],
})
export class QrCodeComponent {

  modal: HTMLIonModalElement;

  @ViewChild('qrcode') qrcodeElement: QrcodeComponent;

  @Input() qrCodeContent: string;
  qrElementType: NgxQrcodeElementTypes = NgxQrcodeElementTypes.CANVAS;
  errorCorrectionLevel: NgxQrcodeErrorCorrectionLevels;
  scale: number = 0.8;
  defaultWidth: number = window.innerHeight * this.scale * 0.4;
  maxWidth: number = window.innerWidth * this.scale;
  qrMargin: number = 3;

  qrImageDataUrl: string;

  constructor(
    private translate: TranslateService,
    public env: EnvService,
    private loadingController: LoadingController,
    private modalController: ModalController,
    private socialSharing: SocialSharing,
    private router: Router,
    private platform: Platform,
    private screenOrientation: ScreenOrientation,
  ) {
    this.platform.ready().then(() => {
      if (this.screenOrientation.type.startsWith(this.screenOrientation.ORIENTATIONS.LANDSCAPE)) {
        this.presentToast(this.translate.instant("MSG.PORTRAIT_ONLY"), "short", "bottom");
      }
      this.screenOrientation.lock(this.screenOrientation.ORIENTATIONS.PORTRAIT);
    });
    this.setErrorCorrectionLevel();
  }

  async ionViewDidEnter(): Promise<void> {
    if (this.qrcodeElement != null) {
      this.qrcodeElement.width = window.innerHeight * this.scale * 0.4;
      this.qrcodeElement.createQRCode();
    }
    await this.modalController.getTop().then(
      async (modal: HTMLIonModalElement) => {
        this.modal = modal;
        this.modal.addEventListener("ionBreakpointDidChange", (ev: any) => {
          if (this.qrcodeElement != null) {
            switch (ev.detail.breakpoint) {
              case 1:
                this.qrcodeElement.width = window.innerWidth * this.scale;
                break;
              case 0.5:
                this.qrcodeElement.width = window.innerHeight * this.scale * 0.4;
                break
            }
            this.qrcodeElement.createQRCode();
          }
        })
        this.modal.onWillDismiss().then(
          async _ => {
            await this.env.toggleOrientationChange();
          }
        );
      }
    )
  }

  setErrorCorrectionLevel() {
    switch (this.env.errorCorrectionLevel) {
      case 'L':
        this.errorCorrectionLevel = NgxQrcodeErrorCorrectionLevels.LOW;
        break;
      case 'M':
        this.errorCorrectionLevel = NgxQrcodeErrorCorrectionLevels.MEDIUM;
        break;
      case 'Q':
        this.errorCorrectionLevel = NgxQrcodeErrorCorrectionLevels.QUARTILE;
        break;
      case 'H':
        this.errorCorrectionLevel = NgxQrcodeErrorCorrectionLevels.HIGH;
        break;
      default:
        this.errorCorrectionLevel = NgxQrcodeErrorCorrectionLevels.MEDIUM;
    }
  }

  async onErrorCorrectionLevelChange() {
    switch (this.env.errorCorrectionLevel) {
      case 'L':
        this.errorCorrectionLevel = NgxQrcodeErrorCorrectionLevels.LOW;
        break;
      case 'M':
        this.errorCorrectionLevel = NgxQrcodeErrorCorrectionLevels.MEDIUM;
        break;
      case 'Q':
        this.errorCorrectionLevel = NgxQrcodeErrorCorrectionLevels.QUARTILE;
        break;
      case 'H':
        this.errorCorrectionLevel = NgxQrcodeErrorCorrectionLevels.HIGH;
        break;
      default:
        this.errorCorrectionLevel = NgxQrcodeErrorCorrectionLevels.MEDIUM;
    }
    await this.env.storageSet("error-correction-level", this.env.errorCorrectionLevel);
    if (this.qrcodeElement != null) {
      this.qrcodeElement.errorCorrectionLevel = this.errorCorrectionLevel;
    } else {
      if (this.env.isDebugging) {
        this.presentToast("Cannot ref qrcodeElement!", "long", "top");
      }
    }
  }

  goErrorCorrectionLevelSetting() {
    this.modalController.dismiss();
    this.router.navigate(['setting-qr-ecl']);
  }

  async shareQrCode(): Promise<void> {
    const loading = await this.presentLoading(this.translate.instant('PREPARING'));
    const canvases = document.querySelectorAll("canvas") as NodeListOf<HTMLCanvasElement>;
    const canvas = canvases[canvases.length - 1];
    if (this.qrImageDataUrl) {
      delete this.qrImageDataUrl;
    }
    this.qrImageDataUrl = canvas.toDataURL("image/png", 0.8);
    loading.dismiss();
    await this.socialSharing.share(this.translate.instant('MSG.SHARE_QR'), this.translate.instant('SIMPLE_QR'), this.qrImageDataUrl, null).then(
      _ => {
        delete this.qrImageDataUrl;
      }
    ).catch(
      err => {
        if (this.env.isDebugging) {
          this.presentToast("Error when call SocialSharing.share: " + JSON.stringify(err), "long", "top");
        }
        delete this.qrImageDataUrl;
      }
    );
  }

  get qrColorDark(): string {
    return "#222428";
  }

  get qrColorLight(): string {
    return "#ffffff";
  }

  async presentLoading(msg: string): Promise<HTMLIonLoadingElement> {
    const loading = await this.loadingController.create({
      message: msg
    });
    await loading.present();
    return loading;
  }

  get color() {
    switch (this.env.colorTheme) {
      case 'dark':
        return 'dark';
      case 'light':
        return 'white';
      case 'black':
        return 'black';
      default:
        return 'white';
    }
  }

  async presentToast(msg: string, duration: "short" | "long", pos: "top" | "center" | "bottom") {
    await Toast.show({
      text: msg,
      duration: duration,
      position: pos
    });
  }

  async tapHaptic() {
    if (this.env.vibration === 'on' || this.env.vibration === 'on-haptic') {
      await Haptics.impact({ style: ImpactStyle.Medium });
    }
  }
}
