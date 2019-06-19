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
      courier: '3',
      trackingNum: '',
      email: '',
      isProcessing: false,
      isErrorMsgShow: false
    };

    // initiate component handler
    this.handleReceiptSourceChange       = this.handleReceiptSourceChange.bind(this);
    this.handleLocaleChange              = this.handleLocaleChange.bind(this);
    this.handleNextButton                = this.handleNextButton.bind(this);
    this.handlerCourierChange            = this.handlerCourierChange.bind(this);
    this.handleTrackingNumberInputChange = this.handleTrackingNumberInputChange.bind(this);
    this.handleEmailInputChange          = this.handleEmailInputChange.bind(this);
    this.handlerTrackingNumberSubmit     = this.handlerTrackingNumberSubmit.bind(this);
  }

  /**
   * Handler for component did mount
   */
  componentDidMount() {
    var self = this;

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
    var self = this;

    if (this.state.isUseTrackingNum) {
      // go to tracking number page
      this.setState({isMainPage: false});
    }
    else {
      // show file dialog
      remote.dialog.showOpenDialog(remote.getCurrentWindow(), {filters: [{name: 'PDF', extensions: ['pdf']}], properties: ['openFile']}, async function(filePaths) {
        if (filePaths && filePaths.length > 0) {
          try {
            self.setState({isErrorMsgShow: false});
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

  /**
   *  Handler for courier dropdown change
   */
  handlerCourierChange(event, {value}) {
    console.log(this.state.courier);
    console.log(value);
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
    var courierOptions = [
      {key: '3', value: '3', text: 'DHL'},
      {key: '9', value: '9', text: 'EMS'},
      {key: '2', value: '2', text: 'FedEx'},
      {key: '1', value: '1', text: 'UPS'},
      {key: '0', value: '0', text: 'USPS'},
      {key: '10', value: '10', text: '中華郵政'},
      {key: '7', value: '7', text: '宅配通'},
      {key: '6', value: '6', text: '黑貓宅急便'},
      {key: '4', value: '4', text: '新竹物流'},
      {key: '5', value: '5', text: '嘉里大榮物流'},
      {key: '8', value: '8', text: '網家速配'},
      {key: '11', value: '11', text: '顺丰速运'},
    ];

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
            <Grid.Column style={{paddingBottom: '5px'}} width="16">
              <Dropdown options={courierOptions} value={this.state.courier} onChange={this.handlerCourierChange} scrolling fluid selection/>
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
