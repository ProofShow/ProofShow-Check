/* eslint-disable import/first */
const { ipcRenderer, remote } = window.require('electron');
import React, { Component } from 'react';
import { Grid, Input, Button, Radio } from 'semantic-ui-react';
import './App.css';

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
      trackingNum: '',
      email: '',
      isProcessing: false,
      isErrorMsgShow: false
    };

    // initiate component handler
    this.handleReceiptSourceChange       = this.handleReceiptSourceChange.bind(this);
    this.handleNextButton                = this.handleNextButton.bind(this);
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
      ipcRenderer.send('proc-with-tracking-number', this.state.trackingNum, this.state.email);
    }
  }

  /**
   *  The main page render
   */
  mainPageRender() {
    return (
      <div className="App">
        <Grid centered>
          <Grid.Row style={{paddingTop: '30px'}}>
            <Grid.Column>
              <Radio style={{color: '#373737', fontSize: '14px', paddingLeft: '80px'}} label='Check a return receipt by tracking number' name='receipt_source' value="byTrackingNum" checked={this.state.isUseTrackingNum === true} onChange={this.handleReceiptSourceChange} />
            </Grid.Column>
          </Grid.Row>
          <Grid.Row style={{paddingBottom: '50px'}}>
            <Grid.Column>
              <Radio style={{color: '#373737', fontSize: '14px', paddingLeft: '80px'}} label='Check a local PDF return receipt' name='receipt_source' value="byLocalFile" checked={this.state.isUseTrackingNum === false} onChange={this.handleReceiptSourceChange} />
            </Grid.Column>
          </Grid.Row>
          <Grid.Row>
            <Grid.Column width="5">
              <Button style={{color: 'white', backgroundColor: '#7579ff', borderColor: '#7579ff', fontWeight: 'normal'}} fluid loading={this.state.isProcessing} disabled={this.state.isProcessing} onClick={this.handleNextButton} >Next</Button>
            </Grid.Column>
          </Grid.Row>
          {this.state.isErrorMsgShow && <p style={{color: 'lightcoral'}}>No valid return receipt can be found</p>}
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
      <div className="App">
        <Grid centered>
          <Grid.Row style={{marginTop: '-10px', paddingTop: '0px', paddingBottom: '10px'}}>
            <Grid.Column>
              {isWin && <p style={{color: '#373737', fontSize: '14px'}}>Enter the parcel's tracking number and the recipient's email address to check the corresponding digital return receipt</p>}
              {isMacOS && <p style={{color: '#373737', fontSize: '14px'}}>Enter the parcel's tracking number and the recipient's email address to check the corresponding digital return receipt</p>}
            </Grid.Column>
          </Grid.Row>
          <Grid.Row>
            <Grid.Column style={{paddingBottom: '5px'}} width="16">
              <Input placeholder="Enter the tracking number" fluid ref={ref => this.trackingNumInput = ref} onChange={this.handleTrackingNumberInputChange} />
            </Grid.Column>
            <Grid.Column width="16">
              <Input placeholder="Enter the email address" fluid ref={ref => this.emailInput = ref} onChange={this.handleEmailInputChange} />
            </Grid.Column>
          </Grid.Row>
          <Grid.Row>
            <Grid.Column width="5">
              <Button style={{color: 'white', backgroundColor: '#7579ff', borderColor: '#7579ff', fontWeight: 'normal'}} fluid loading={this.state.isProcessing} disabled={this.state.isProcessing} onClick={this.handlerTrackingNumberSubmit} >Check</Button>
            </Grid.Column>
          </Grid.Row>
          {this.state.isErrorMsgShow && <p style={{color: 'lightcoral'}}>No valid return receipt can be found</p>}
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
