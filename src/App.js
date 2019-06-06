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
      isUseReceiptID: true,
      receiptID: '',
      isProcessing: false,
      isErrorMsgShow: false
    };

    // initiate component handler
    this.handleReceiptSourceChange  = this.handleReceiptSourceChange.bind(this);
    this.handleNextButton           = this.handleNextButton.bind(this);
    this.handelReceiptIDInputChange = this.handelReceiptIDInputChange.bind(this);
    this.handleReceiptIDSubmit      = this.handleReceiptIDSubmit.bind(this);
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
    if (value === 'byReceiptID')
      this.setState({isUseReceiptID: true});
    else
      this.setState({isUseReceiptID: false});
  }

  /**
   *  Handler for next button click
   */
  handleNextButton() {
    var self = this;

    if (this.state.isUseReceiptID) {
      // go to receiptID page
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
   *  Handler for receiptID input change
   */
  handelReceiptIDInputChange(event) {
    this.setState({receiptID: event.target.value});
  }

  /**
   *  Handler for receiptID submit
   */
  handleReceiptIDSubmit() {
    var receiptID = this.state.receiptID;

    this.setState({isErrorMsgShow: false});

    // check the input is not empty
    if (receiptID.length === 0) {
      this.receiptIDInput.focus();
    } else {
      this.setState({isProcessing: true});

      // send "proc-with-receipt-id" event with receiptID
      ipcRenderer.send('proc-with-receipt-id', this.state.receiptID);
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
              <Radio style={{color: '#373737', fontSize: '14px', paddingLeft: '80px'}} label='Check a return receipt by receiptID' name='receipt_source' value="byReceiptID" checked={this.state.isUseReceiptID === true} onChange={this.handleReceiptSourceChange} />
            </Grid.Column>
          </Grid.Row>
          <Grid.Row style={{paddingBottom: '50px'}}>
            <Grid.Column>
              <Radio style={{color: '#373737', fontSize: '14px', paddingLeft: '80px'}} label='Check a local PDF return receipt' name='receipt_source' value="byLocalFile" checked={this.state.isUseReceiptID === false} onChange={this.handleReceiptSourceChange} />
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
   *  The receiptID page render
   */
  receiptIDPageRender() {
    var isWin = remote.getGlobal('isWin');
    var isMacOS = remote.getGlobal('isMacOS');

    return (
      <div className="App">
        <Grid centered>
          <Grid.Row style={{paddingTop: '30px', paddingBottom: '30px'}}>
            <Grid.Column>
              {isWin && <p style={{color: '#373737', fontSize: '14px'}}>Obtain the <span style={{fontStyle: 'italic'}}>receiptID</span> of a return receipt from your courier company</p>}
              {isMacOS && <p style={{color: '#373737', fontSize: '14px'}}>Obtain the <span style={{fontStyle: 'italic'}}>receiptID</span> of a return receipt from your courier company</p>}
            </Grid.Column>
          </Grid.Row>
          <Grid.Row>
            <Grid.Column width="16">
              <Input placeholder="Enter the receiptID" fluid ref={ref => this.receiptIDInput = ref} onChange={this.handelReceiptIDInputChange} />
            </Grid.Column>
          </Grid.Row>
          <Grid.Row>
            <Grid.Column width="5">
              <Button style={{color: 'white', backgroundColor: '#7579ff', borderColor: '#7579ff', fontWeight: 'normal'}} fluid loading={this.state.isProcessing} disabled={this.state.isProcessing} onClick={this.handleReceiptIDSubmit} >Check</Button>
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
    return this.state.isMainPage ?  this.mainPageRender() : this.receiptIDPageRender();
  }
}

export default App;
