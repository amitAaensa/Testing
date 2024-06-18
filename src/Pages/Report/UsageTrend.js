import React, { useEffect, useRef, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Link } from "react-router-dom";
import Loader from "../../utils/Loader";
import Chart from "chart.js/auto";
import axios from "axios";
import {
  cleartableGraph_response,
  cleartableGraph_error,
  TableGraph,
} from "../../Slices/ReportSlices";

import {
  OptimizerList,
  clearOptimizerResponse,
} from "../../Slices/Enterprise/OptimizerSlice";

const UsageTrends = (Data) => {
  const dispatch = useDispatch();
  const { tableGraph_response, tableGraph_error, loading1 } = useSelector(
    (state) => state.reportSlice
  );
  const header = {
    headers: {
      Authorization: `Bearer ${window.localStorage.getItem("token")}`,
    },
  };
  const [selectedOptimizerName, setSelectedOptimizerName] = useState(""); //this is Optimizer Name
  // const [selectedOption, setSelectedOption] = useState("");
  const [optimizerList, setOptimizerList] = useState([]);
  const [tableData, setTableData] = useState([]);
  const [id, setId] = useState("");
  const [stime, setSTime] = useState([])
  const [etime, setETime] = useState([])

  // Function to format time into hrs:min:sec format
  const formatTime = (totalSeconds) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours}hrs:${minutes}min:${seconds}sec`;
  };


  const parseDate = (dateString) => {
    return new Date(dateString).getTime();
  };

  const startDate = parseDate(Data.Data.startDate);
  const endDate = parseDate(Data.Data.endDate);

  const [selectedOption, setSelectedOption] = useState("");
  const [options, setOptions] = useState([]);

  useEffect(() => {
    const calculateDateDifference = () => {
      const msInHour = 1000 * 60 * 60;
      const msInDay = msInHour * 24;
      const msInWeek = msInDay * 7;
      const msInMonth = msInDay * 30; // Approximate month
      const msInYear = msInDay * 365; // Approximate year

      const diff = endDate - startDate;

      // console.log("Date Difference (ms):", diff); // Log the date difference for debugging

      if (diff < msInDay) {
        return ["", "Hourly"];
      } else if (diff <= msInWeek) {
        return ["", "Day", "Week"];
      } else if (diff <= msInMonth) {
        return ["", "Day", "Week", "Month"];
      } else if (diff <= msInYear) {
        return ["", "Week", "Month", "Year"];
      } else {
        return ["", "Week", "Month", "Year"];
      }
    };

    const options = calculateDateDifference();
    // console.log("Calculated Options:", options); // Log the calculated options for debugging
    setOptions(options);
  }, [startDate, endDate]);

  const chartRef = useRef(null);

  // Extracting data from tableData
  useEffect(() => {
    const labels = tableData.map((row, index) => `${formatDate(stime[index], selectedOption)}`);
    const thermostatCutoffData = tableData.map(row => row.totalCutoffTimeThrm);
    const deviceCutoffData = tableData.map(row => row.totalCutoffTimeOpt);
    const totalRuntimeSumData = tableData.map(row => row.totalRemainingTime + row.totalCutoffTimeOpt + row.totalCutoffTimeThrm);

    const myChart = new Chart(chartRef.current, {
      
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Thermostat Cutoff(time)",
            backgroundColor: "purple",
            data: thermostatCutoffData,
            borderWidth: 1,
          },
          {
            label: "Device Cutoff(time)",
            backgroundColor: "brown",
            data: deviceCutoffData,
            borderWidth: 1,
          },
          {
            label: "Total Runtime",
            backgroundColor: "#0694a2",
            data: totalRuntimeSumData,
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function (value, index, values) {
                const hours = Math.floor(value / 3600);
                return `${hours}h`;
              }
            },
            title: {
              display: true,
              text: 'Time (hours)',
            },
          },
        },
        plugins: {
          tooltip: {
            callbacks: {
              label: function (context) {
                let label = context.dataset.label || '';
                if (label) {
                  label += ': ';
                }
                label += formatTime(context.raw);
                return label;
              }
            }
          }
        },
      },
    });

    // Cleanup function to destroy the chart when the component unmounts
    return () => myChart.destroy();
  }, [tableData]);


  const GatewayId = Data.Data.gateway_id;

  // Optimizer

  const { optimizer_response } = useSelector((state) => state.optimizerSlice);

  const Optimizer = async () => {
    dispatch(OptimizerList({ GatewayId, header }));
  };

  const handleFormChange4 = (e) => {
    const { name, value } = e.target;
    // for Gateway id
    const selectedOptimizer = optimizerList.find(
      (item) => item.OptimizerID === value
    );

    setSelectedOptimizerName(selectedOptimizer.OptimizerID);
    // Check if selectedEnterprise is not undefined before accessing its properties
    if (selectedOptimizer && selectedOptimizer._id) {
      setId(selectedOptimizer._id);
    }
  };
  // Table, Graph Data
  useEffect(() => {
    // console.log({ selectedOption });
    async function tableData() {
      const data = {
        Interval: selectedOption,
        startDate: Data.Data.startDate,
        endDate: Data.Data.endDate,
        enterprise_id: Data.Data.enterprise_id,
        state_id: Data.Data.state_id,
        location_id: Data.Data.location_id,
        gateway_id: Data.Data.gateway_id,
        Optimizerid: selectedOptimizerName,
      };
      dispatch(TableGraph({ data, header }));
    }
    if (selectedOption != "") {
      tableData();
    }
  }, [selectedOption, selectedOptimizerName]);

  // Function to convert Unix timestamp to formatted date string in IST
  const convertUnixToFormattedDate = (unixTimestamp) => {
    const date = new Date(unixTimestamp * 1000); // Convert seconds to milliseconds
    return date.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      timeZone: 'Asia/Kolkata' // Set time zone to IST
    });
  };

  // End Id's
  useEffect(() => {
    if (
      optimizer_response &&
      optimizer_response.AllEntStateLocationGatewayOptimizer
    ) {
      setOptimizerList(optimizer_response.AllEntStateLocationGatewayOptimizer);

      dispatch(clearOptimizerResponse());
    }
    if (tableGraph_response) {
      setTableData(tableGraph_response.data);
      const start = tableGraph_response.data.map(row => convertUnixToFormattedDate(row.StartTime));
      const end = tableGraph_response.data.map(row => convertUnixToFormattedDate(row.EndTime));
      setSTime(start);
      setETime(end);
      // console.log({ stime }, { etime });
    }
  }, [dispatch, optimizer_response, tableGraph_response]);
  
  // Function to format dates based on selected option
  const formatDate = (dateString, option) => {
    const dateParts = dateString.split(", ");
    const day = dateParts[1].split(" ")[1].slice(0, 2); // Remove the last character
    const month = dateParts[1].split(" ")[0];
    const year = dateParts[2].split(" ")[0];
    // const time = dateParts[3].slice(0, -3); // Removing " AM" or " PM"

    if (option === "Day") {
      return `${day} ${month}`; // Format the date for "Day" option
    } else if (option === "Week") {
      // Extract day and month from start and end dates
      const startDay = stime[0].split(", ")[1].split(" ")[1].slice(0, 2);
      const startMonth = stime[0].split(", ")[1].split(" ")[0];
      const endDay = etime[etime.length - 1].split(", ")[1].split(" ")[1].slice(0, 2);
      const endMonth = etime[etime.length - 1].split(", ")[1].split(" ")[0];

      return `${startDay} ${startMonth} - ${endDay} ${endMonth}`;
    } else if (option === "Month") {
      return month;
    } else if (option === "Year") {
      return year;
    }
    return dateString;
  };

  //Download CSV
  const downloadFile = async (url, requestBody, defaultFilename) => {
    try {
      const response = await axios.post(url, requestBody, {
        responseType: "blob",
      });
      const disposition = response.headers["content-disposition"];
      const filename = disposition
        ? disposition.split("filename=")[1]
        : defaultFilename;

      const urlBlob = window.URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement("a");
      a.href = urlBlob;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (error) { }
  };

  const handleDownloadDeviceData = async () => {
    // const requestBody = { ...Data.Data, Interval: intervalInSeconds };

    await downloadFile(
      `${process.env.REACT_APP_API}/api/admin/download/all/devicedata/report`,
      // requestBody,
      `DeviceDataReport_${new Date().toLocaleString("en-US", {
        timeZone: "Asia/Kolkata",
      })}.csv`
    );
  };

  return (
    <>
      {loading1 && <Loader />}
      <div role="tabpanel">
        <div className="flex  items-center">
          <div className="w-56 flex justify-between items-center "
            style={{ marginLeft: "2%", width: "20%" }}
          >
            <h4 className="classtitle mr-4">Interval</h4>
            <select
              className="block w-full mt-1 text-sm dark:text-gray-300 dark:border-gray-600 dark:bg-gray-700 form-select focus:border-purple-400 focus:outline-none focus:shadow-outline-purple dark:focus:shadow-outline-gray"
              value={selectedOption}
              onChange={(e) => setSelectedOption(e.target.value)}
            >
              {" "}
              <options></options>
              {options.map((option, index) => (
                <option key={index} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div
            className="w-56 flex justify-between items-center"
            style={{ marginLeft: "2%", width: "30%" }}
          >
            <h4 className="classtitle mr-4">Optimizer</h4>
            <select
              className="block w-full mt-1 text-sm dark:text-gray-300 dark:border-gray-600 dark:bg-gray-700 form-select focus:border-purple-400 focus:outline-none focus:shadow-outline-purple dark:focus:shadow-outline-gray"
              name="optimizerId"
              // value=""
              onChange={handleFormChange4}
              onFocus={Optimizer}
            >
              {" "}
              <option></option>
              {optimizerList.map((item, index) => (
                <option key={index}>{item.OptimizerID}</option>
              ))}
            </select>
          </div>

          <div
            className="download_btn"
            style={{
              position: "sticky",
              top: "0",
              zIndex: "1000",
              display: "flex",
              flexDirection: "column",
              marginLeft: "45%",
            }}
          >
            <button
              type="button"
              className="py-2 px-3 mt-2 focus:outline-none text-white rounded-lg   "
              onClick={handleDownloadDeviceData}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#4a90e2"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 15v4c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2v-4M17 9l-5 5-5-5M12 12.8V2.5" />
              </svg>
            </button>
          </div>
        </div>

        <div
          className="grid gap-6 mb-8 "
          style={{ marginTop: "1%", marginLeft: "2%", marginRight: "2%" }}
        >


          <div className="min-w-0 p-4 bg-white rounded-lg shadow-xs dark:bg-gray-800">
            <h4 className="mb-4 font-semibold text-gray-800 dark:text-gray-300">
              Month On Month Energy Savings
            </h4>

            <canvas ref={chartRef} id="myChart" style={{ maxHeight: "95%" }} />
          </div>
        </div>

        <div className="min-w-0 p-4 bg-white rounded-lg shadow-xs dark:bg-gray-800">
          <table className="w-full whitespace-wrap">
            <thead>
              <tr className="text-xs font-semibold tracking-wide text-left text-gray-500 uppercase border-b dark:border-gray-700 bg-gray-50 dark:text-gray-400 dark:bg-gray-800">
                <th className="px-4 py-3">{selectedOption}</th>
                <th className="px-4 py-3">OPTIMIZER ID</th>
                <th className="px-4 py-3">Thermostat Cutoff (hrs)</th>
                <th className="px-4 py-3">Device Cutoff (hrs)</th>
                <th className="px-4 py-3">Remaning Runtime(hrs)</th>
                <th className="px-4 py-3">Total Runtime(hrs)</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y dark:divide-gray-700 dark:bg-gray-800">

              {tableData.map((row, index) => (
                <tr key={index} className="text-gray-700 dark:text-gray-400">
                  <td className="px-4 py-3">{formatDate(stime[index], selectedOption)}</td>
                  <td className="px-4 py-3">{row._id}</td>
                  <td className="px-4 py-3">{formatTime(row.totalCutoffTimeThrm)}</td>
                  <td className="px-4 py-3">{formatTime(row.totalCutoffTimeOpt)}</td>
                  <td className="px-4 py-3">{formatTime(row.totalRemainingTime)}</td>
                  <td className="px-4 py-3">{formatTime(row.totalRemainingTime + row.totalCutoffTimeOpt + row.totalCutoffTimeThrm)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="block opacity-100" id="matadeta" role="tabpanel">
            <div className="grid px-4 py-3 text-xs font-semibold tracking-wide text-gray-500 uppercase border-t dark:border-gray-700 bg-gray-50 sm:grid-cols-9 dark:text-gray-400 dark:bg-gray-800">
              <span className="flex items-center col-span-3">
                {/* {`Page No.  ${page} `} */}
              </span>
              <span className="col-span-2"></span>
              {/* Pagination  */}

              <span className="flex col-span-4 mt-2 sm:mt-auto sm:justify-end">
                <nav aria-label="Table navigation">
                  <ul className="inline-flex items-center">
                    <li>
                      <button
                        className="py-2 px-3 mt-2 focus:outline-none text-white rounded-lg bg-purple-600 active:bg-purple-600"
                        style={{ marginRight: "10px" }}
                        aria-label="Previous"
                        onClick={(event) => {
                          // handlePrevClick(event);
                        }}
                      >
                        Prev
                      </button>
                    </li>
                    {/* {renderPaginationButtons()} */}
                    <li>
                      <button
                        className="py-2 px-3 mt-2 focus:outline-none text-white rounded-lg bg-purple-600 active:bg-purple-600"
                        aria-label="Next"
                        onClick={(event) => {
                          // handleNextClick(event);
                        }}
                      >
                        Next
                      </button>
                    </li>
                  </ul>
                </nav>
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
export default UsageTrends;
