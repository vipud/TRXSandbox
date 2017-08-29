import React, {Component} from 'react';
import * as firebase from 'firebase';
const ReactDataGrid = require('react-data-grid');
const {Toolbar, Data: { Selectors } } = require('react-data-grid-addons');


//this component deals with the data table for
//tracking student performance during the game

class StudentStats extends Component {
  constructor(props) {
    super(props);
    this.state = {
      //declares all the coloums for the datatable
      students: [],
      user: this.props.user,
      MarketVWAP: '',
      columns: [{
          key: 'id',
          name: 'ID',
          width: 80
        },
        {
          key: 'user',
          name: 'User',
          filterable: true,
          sortable: true
        },
        {
          key: 'abc',
          name: 'ABC',
          filterable: true,
          sortable: true
        },
        {
          key: 'cash',
          name: 'Cash',
          filterable: true,
          sortable: true
        },
        {
          key: 'avgbuy',
          name: 'AverageBuyPrice',
          filterable: true,
          sortable: true
        },
        {
          key: 'avgsell',
          name: 'AverageSellPrice',
          filterable: true,
          sortable: true
        }
      ],
      rows: '',
      sortColumn: null,
      sortDirection: null,
      filters: {}
    }
    this.getRows = this.getRows.bind(this);
    this.rowGetter = this.rowGetter.bind(this);
    this.handleFilterChange = this.handleFilterChange.bind(this);
    this.getSize = this.getSize.bind(this);
    this.handleGridSort = this.handleGridSort.bind(this);
    this.onClearFilters = this.onClearFilters.bind(this);
    this.createRows = this.createRows.bind(this);
  }

  componentDidMount() {
    //console.log(this.props.location.state.sessionid);
    this.userRef = firebase.database().ref().child(this.props.institution).child("Sessions").child(this.props.location.state.sessionid).child("Users");
    this.vwapRef = firebase.database().ref().child(this.props.institution).child("Sessions").child(this.props.location.state.sessionid).child("Assets").child("INTC").child("VWAP");
    var username, shares, cash, BuyVWAP, SellVWAP;

    //this listener sets MarketVWAP
    this.vwapRef.on('value', snap => {
      if (snap.val()) {
        this.setState({
          MarketVWAP: snap.val()
        });
      } else {
        this.setState({
          MarketVWAP: ''
        });
      }
    });

    //this listener sets all of user stats
    this.userRef.on('value', snap => {
      var rawData = snap.val();
      //console.log(rawData);
      var stdnts = [];
      for (var key in rawData) {
        if (key !== '0') {
          username = rawData[key].DisplayName;
          shares = rawData[key].Assets.INTC.Stats.Shares;
          cash = rawData[key].Assets.Cash;
          BuyVWAP = rawData[key].Assets.INTC.Stats.BuyVWAP;
          SellVWAP = rawData[key].Assets.INTC.Stats.SellVWAP;
          //MarketVWAP = this.state.MarketVWAP;

          stdnts.push({
            //need to read user object i think
            "User": username,
            "Shares": shares,
            "Cash": cash,
            "AverageBuyPrice": BuyVWAP,
            "AverageSellPrice": SellVWAP
            // "MarketVWAP": MarketVWAP
          });
        }
      }
      this.setState({
        students: stdnts
      });
      //console.log(this.state.students);
      //calls create rows
      this.createRows();
    })

  }

  componentWillUnmount() {
    this.vwapRef.off();
    this.userRef.off();
  }

  createRows() {
    let rows = [];
    //console.log(this.state.students);
    for (let i = 0; i < this.state.students.length; i++) {
      //for all students in state.students, push a row
      rows.push({
        id: i + 1,
        user: this.state.students[i].User,
        abc: this.state.students[i].Shares,
        cash: this.state.students[i].Cash,
        avgbuy: this.state.students[i].AverageBuyPrice,
        avgsell: this.state.students[i].AverageSellPrice
      });
    }
    this.setState({
      rows: rows
    })
  }

  getRows() {
    return Selectors.getRows(this.state);
  }

  getSize() {
    return this.getRows().length;
  }

  rowGetter(rowIdx) {
    const rows = this.getRows();
    return rows[rowIdx];
  }

  handleGridSort(sortColumn, sortDirection) {
    this.setState({
      sortColumn: sortColumn,
      sortDirection: sortDirection
    });
  }

  handleFilterChange(filter) {
    let newFilters = Object.assign({}, this.state.filters);
    if (filter.filterTerm) {
      newFilters[filter.column.key] = filter;
    } else {
      delete newFilters[filter.column.key];
    }

    this.setState({
      filters: newFilters
    });
  }

  onClearFilters() {
    this.setState({
      filters: {}
    });
  }

  render() {
    return (
      <ReactDataGrid
        onGridSort={this.handleGridSort}
        enableCellSelect={true}
        columns={this.state.columns}
        rowGetter={this.rowGetter}
        rowsCount={this.getSize()}
        minHeight={550}
        toolbar={<Toolbar enableFilter={true}/>
        }
        onAddFilter = {
          this.handleFilterChange
        }
        onClearFilters = {
          this.onClearFilters
        }
      />
    );
  }
};

export default StudentStats;
