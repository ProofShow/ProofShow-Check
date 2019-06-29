/* eslint-disable import/first */
const { ipcRenderer, remote } = window.require('electron');
import React, { Component } from 'react';
import { Grid, Input, Button, Radio, Dropdown } from 'semantic-ui-react';
import './App.css';

const i18n = remote.getGlobal('i18n');

class App extends Component {
  /**
   *  Constructor for App component
   */
  constructor(props) {
    super(props);

    // initiate component state
    this.state = {
      isMainPage: true,
      isUseTrackingNum: true,
      locale: remote.getGlobal('settingData').locale,
      country: '',
      courier: '',
      trackingNum: '',
      email: '',
      isProcessing: false,
      isErrorMsgShow: false,
    };

    // initiate component handler
    this.handleReceiptSourceChange       = this.handleReceiptSourceChange.bind(this);
    this.handleLocaleChange              = this.handleLocaleChange.bind(this);
    this.handleNextButton                = this.handleNextButton.bind(this);
    this.handleCountryChange             = this.handleCountryChange.bind(this);
    this.handlerCourierChange            = this.handlerCourierChange.bind(this);
    this.handleTrackingNumberInputChange = this.handleTrackingNumberInputChange.bind(this);
    this.handleEmailInputChange          = this.handleEmailInputChange.bind(this);
    this.handlerTrackingNumberSubmit     = this.handlerTrackingNumberSubmit.bind(this);

    // initiate country options
    this.countryOptions = [];
    remote.getGlobal('countries').forEach(function(country) {
      this.countryOptions.push({
        key: country.countryCode,
        value: country.countryCode,
        flag: country.countryCode,
        text: country.name
      });
    }.bind(this));

    // initiate courier options
    this.courierOptions = [];

    // initiate locale country mapping
    this.localeCountryMapping = {
      'en': 'us',
      'id': 'id',
      'ja': 'jp',
      'ko': 'kr',
      'th': 'th',
      'vi': 'vn',
      'zh-CN': 'cn',
      'zh-TW': 'tw'
    };
  }

  /**
   * Handler for component did mount
   */
  componentDidMount() {
    var self = this;

    // listen the "check-acrobat-finish" event
    ipcRenderer.on('check-acrobat-finish', function(event, isPass) {
      self.setState({isProcessing: false});

      if (isPass) {
        if (self.state.isUseTrackingNum) {
          // go to tracking number page
          self.courierOptions = self.genCourierOptions(self.localeCountryMapping[self.state.locale]);
          self.setState({courier: self.courierOptions[0].value});
          self.setState({country: self.localeCountryMapping[self.state.locale]});
          self.setState({isMainPage: false});
        }
        else {
          // show file dialog
          remote.dialog.showOpenDialog(remote.getCurrentWindow(), {filters: [{name: 'PDF', extensions: ['pdf']}], properties: ['openFile']}, async function(filePaths) {
            if (filePaths && filePaths.length > 0) {
              try {
                self.setState({isProcessing: true});

                // send "proc-with-local-file" event with file path
                ipcRenderer.send('proc-with-local-file', filePaths[0]);
              } catch (err) {
                console.log(err);
              }
            } else {
              console.log('cancel');
            }
          });
        }
      }
    });

    // listen the "proc-finish" event
    ipcRenderer.on('proc-finish', function(event, error) {
      // set the processing falg to false
      self.setState({isProcessing: false});

      // show error message if process failed
      if (error) {
        self.setState({isErrorMsgShow: true});
      }
    });
  }

  /**
   * Generate courier options
   */
   genCourierOptions(countryCode) {
     var couriers = remote.getGlobal('couriers');
     var countryCouriers = couriers[countryCode] ? couriers[countryCode] : couriers.default;
     var courierOptions = [];

     countryCouriers.forEach(function(courier) {
       courierOptions.push({
         key: courier.code,
         value: courier.code,
         text: courier.name
       });
     });

     return courierOptions;
   }

  /**
   *  Handler for receipt source change
   */
  handleReceiptSourceChange(event, {value}) {
    if (value === 'byTrackingNum')
      this.setState({isUseTrackingNum: true});
    else
      this.setState({isUseTrackingNum: false});
  }

  /**
   * Handler for locale dropdown change
   */
  handleLocaleChange(event, {value}) {
    this.setState({locale: value});
    ipcRenderer.send('locale-change', value);
  }

  /**
   *  Handler for next button click
   */
  handleNextButton() {
    this.setState({isErrorMsgShow: false});
    this.setState({isProcessing: true});
    ipcRenderer.send('check-acrobat');
  }

  /**
   *  Handler for counrty dropdown change
   */
  handleCountryChange(event, {value}) {
    var couriers = remote.getGlobal('couriers');
    var countryCouriers = couriers[value] ? couriers[value] : couriers.default;

    this.courierOptions = this.genCourierOptions(value);
    this.setState({courier: countryCouriers[0].code});
    this.setState({country: value});
  }

  /**
   *  Handler for courier dropdown change
   */
  handlerCourierChange(event, {value}) {
    this.setState({courier: value});
  }

  /**
   *  Handler for tracking number input change
   */
  handleTrackingNumberInputChange(event) {
    this.setState({trackingNum: event.target.value});
  }

  /**
   * Handler for email input change
   */
   handleEmailInputChange(event) {
     this.setState({email: event.target.value});
   }

  /**
   *  Handler for tracking number submit
   */
  handlerTrackingNumberSubmit() {
    var trackingNum = this.state.trackingNum;
    var email       = this.state.email;

    this.setState({isErrorMsgShow: false});

    // check the input is not empty
    if (trackingNum.length === 0) {
      this.trackingNumInput.focus();
    }
    else if (email.length === 0) {
      this.emailInput.focus();
    } else {
      this.setState({isProcessing: true});

      // send "proc-with-tracking-number" event with tracking number
      ipcRenderer.send('proc-with-tracking-number', this.state.courier, this.state.trackingNum, this.state.email);
    }
  }

  /**
   *  The main page render
   */
  mainPageRender() {
    var langOptions = [
      {key: 'en', value: 'en', text: 'English'},
      {key: 'id', value: 'id', text: 'Orang indonesia'},
      {key: 'ja', value: 'ja', text: '日本語'},
      {key: 'ko', value: 'ko', text: '한국어'},
      {key: 'th', value: 'th', text: 'ไทย'},
      {key: 'vi', value: 'vi', text: 'Tiếng việt'},
      {key: 'zh-CN', value: 'zh-CN', text: '简体中文'},
      {key: 'zh-TW', value: 'zh-TW', text: '繁體中文'}
    ];
    var localeFontSize = (this.state.locale === 'id') ? '11px' : '14px';
    var localeLeftPadding = (this.state.locale === 'id') ? '70px' : '75px';

    return (
      <div className="AppMainPage">
        <Dropdown style={{position: 'relative', top: '-35px', left: '270px', fontWeight: 'normal'}} options={langOptions} value={this.state.locale} onChange={this.handleLocaleChange} scrolling selection button className='mini' />
        <Grid centered>
          <Grid.Row style={{paddingTop: '40px'}}>
            <Grid.Column>
              <Radio style={{color: '#373737', fontSize: localeFontSize, paddingLeft: localeLeftPadding}} label={i18n.__('msg_check_receipt_by_number')} name='receipt_source' value="byTrackingNum" checked={this.state.isUseTrackingNum === true} onChange={this.handleReceiptSourceChange} />
            </Grid.Column>
          </Grid.Row>
          <Grid.Row style={{paddingBottom: '68px'}}>
            <Grid.Column>
              <Radio style={{color: '#373737', fontSize: localeFontSize, paddingLeft: localeLeftPadding}} label={i18n.__('msg_check_receipt_by_file')} name='receipt_source' value="byLocalFile" checked={this.state.isUseTrackingNum === false} onChange={this.handleReceiptSourceChange} />
            </Grid.Column>
          </Grid.Row>
          <Grid.Row>
            <Grid.Column width="6">
              <Button style={{color: 'white', backgroundColor: '#7579ff', borderColor: '#7579ff', fontWeight: 'normal', width: "100%"}} fluid loading={this.state.isProcessing} disabled={this.state.isProcessing} onClick={this.handleNextButton} >{i18n.__('btn_next')}</Button>
            </Grid.Column>
          </Grid.Row>
          {this.state.isErrorMsgShow && <p style={{color: 'lightcoral'}}>{i18n.__('warning_no_specified_receipt')}</p>}
        </Grid>
      </div>
    )
  }

  /**
   *  The tracking number page render
   */
  trackingNumPageRender() {
    var isWin = remote.getGlobal('isWin');
    var isMacOS = remote.getGlobal('isMacOS');

    return (
      <div className="AppNumberpage">
        <Grid centered>
          <Grid.Row style={{marginTop: '-10px', paddingTop: '0px', paddingBottom: '10px'}}>
            <Grid.Column>
              {isWin && <p style={{color: '#373737', fontSize: '14px', height: '40px'}}>{i18n.__('msg_enter_number_description')}</p>}
              {isMacOS && <p style={{color: '#373737', fontSize: '14px', height: '40px'}}>{i18n.__('msg_enter_number_description')}</p>}
            </Grid.Column>
          </Grid.Row>
          <Grid.Row>
            <Grid.Column style={{paddingBottom: '5px'}} width="8">
              <Dropdown options={this.countryOptions} value={this.state.country} onChange={this.handleCountryChange} scrolling fluid selection/>
            </Grid.Column>
            <Grid.Column style={{paddingBottom: '5px'}} width="8">
              <Dropdown options={this.courierOptions} value={this.state.courier} onChange={this.handlerCourierChange} scrolling fluid selection/>
            </Grid.Column>
            <Grid.Column style={{paddingBottom: '5px'}} width="16">
              <Input placeholder={i18n.__('msg_enter_number_placeholder')} fluid ref={ref => this.trackingNumInput = ref} onChange={this.handleTrackingNumberInputChange} />
            </Grid.Column>
            <Grid.Column width="16" style={{paddingBottom: '15px'}}>
              <Input placeholder={i18n.__('msg_enter_email_placeholder')} fluid ref={ref => this.emailInput = ref} onChange={this.handleEmailInputChange} />
            </Grid.Column>
          </Grid.Row>
          <Grid.Row>
            <Grid.Column width="6">
              <Button style={{color: 'white', backgroundColor: '#7579ff', borderColor: '#7579ff', fontWeight: 'normal', width: "90%"}} fluid loading={this.state.isProcessing} disabled={this.state.isProcessing} onClick={this.handlerTrackingNumberSubmit} >{i18n.__('btn_check')}</Button>
            </Grid.Column>
          </Grid.Row>
          {this.state.isErrorMsgShow && <p style={{color: 'lightcoral'}}>{i18n.__('warning_no_specified_receipt')}</p>}
        </Grid>
      </div>
    );
  }

  /**
   * Render handler for component
   */
  render() {
    return this.state.isMainPage ?  this.mainPageRender() : this.trackingNumPageRender();
  }
}

export default App;
