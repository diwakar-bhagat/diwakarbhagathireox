import React, { useEffect, useState } from 'react'
import { FaArrowLeft, FaCheckCircle } from 'react-icons/fa'
import { useNavigate } from 'react-router-dom'
import { motion as Motion } from "motion/react";
import axios from 'axios';
import { ServerUrl } from '../App';
import { useDispatch } from 'react-redux';
import { setUserData } from '../redux/userSlice';
import { clearPaymentProcessing, setPaymentProcessing } from '../redux/uiSlice';
function Pricing() {
  const navigate = useNavigate()
  const [selectedPlan, setSelectedPlan] = useState("free");
  const [loadingPlan, setLoadingPlan] = useState(null);
  const dispatch = useDispatch()

  useEffect(() => {
    return () => {
      dispatch(clearPaymentProcessing())
    }
  }, [dispatch])

  const plans = [
    {
      id: "free",
      name: "Free",
      price: "₹0",
      credits: 100,
      description: "Perfect for beginners starting interview preparation.",
      features: [
        "100 AI Interview Credits",
        "Basic Performance Report",
        "Voice Interview Access",
        "Limited History Tracking",
      ],
      default: true,
    },
    {
      id: "basic",
      name: "Starter Pack",
      price: "₹39",
      credits: 150,
      description: "Great for focused practice and skill improvement.",
      features: [
        "150 AI Interview Credits",
        "Detailed Feedback",
        "Performance Analytics",
        "Full Interview History",
      ],
    },
    {
      id: "pro",
      name: "Pro Pack",
      price: "₹69",
      credits: 350,
      description: "Best value for serious job preparation.",
      features: [
        "350 AI Interview Credits",
        "Advanced AI Feedback",
        "Skill Trend Analysis",
        "Priority AI Processing",
      ],
      badge: "Best Value",
    },
  ];



  const handlePayment = async (plan) => {
    if (!window.Razorpay) {
      dispatch(setPaymentProcessing({ status: "error", message: "Unable to load payment gateway. Please refresh and try again." }))
      return;
    }

    try {
      setLoadingPlan(plan.id)
      dispatch(setPaymentProcessing({ status: "processing" }))

      const amount =
        plan.id === "basic" ? 39 :
          plan.id === "pro" ? 69 : 0;

      const result = await axios.post(ServerUrl + "/api/payment/order", {
        planId: plan.id,
        amount: amount,
        credits: plan.credits,
      }, { withCredentials: true })


      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: result.data.amount,
        currency: "INR",
        name: "HireOX.AI",
        description: `${plan.name} - ${plan.credits} Credits`,
        order_id: result.data.id,

        handler: async function (response) {
          try {
            const verifypay = await axios.post(ServerUrl + "/api/payment/verify", response, { withCredentials: true })
            dispatch(setUserData(verifypay.data.user))
            dispatch(setPaymentProcessing({ status: "success" }))
            setLoadingPlan(null);
            window.setTimeout(() => {
              navigate("/")
            }, 320);
          } catch (error) {
            console.log(error);
            dispatch(setPaymentProcessing({ status: "error", message: "Unable to verify payment." }))
            setLoadingPlan(null);
          }
        },
        modal: {
          ondismiss: () => {
            dispatch(setPaymentProcessing({ status: "error", message: "Payment window was closed." }))
            setLoadingPlan(null);
          },
        },
        theme: {
          color: "#5100FF",
        },
      }

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", () => {
        dispatch(setPaymentProcessing({ status: "error", message: "Transaction failed." }))
        setLoadingPlan(null);
      });
      rzp.open();
    } catch (error) {
      console.log(error)
      dispatch(setPaymentProcessing({ status: "error", message: "Could not start payment." }))
      setLoadingPlan(null);
    }
  }



  return (
    <div className='min-h-screen py-16 px-6 relative z-10'>

      <div className='max-w-6xl mx-auto mb-14 flex items-start gap-4'>

        <button onClick={() => navigate("/")} className='mt-2 p-3 rounded-full glass-card hover:bg-white/10 transition'>
          <FaArrowLeft className='text-slate-300' />
        </button>

        <div className="text-center w-full">
          <h1 className="text-4xl font-bold text-slate-100">
            Choose Your Plan
          </h1>
          <p className="text-slate-400 mt-3 text-lg">
            Flexible pricing to match your interview preparation goals.
          </p>
        </div>
      </div>


      <div className='grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto'>

        {plans.map((plan) => {
          const isSelected = selectedPlan === plan.id

          return (
            <Motion.div key={plan.id}
              whileHover={!plan.default && { scale: 1.03 }}
              onClick={() => !plan.default && setSelectedPlan(plan.id)}

              className={`relative glass-card p-8 transition-all duration-300 
                ${isSelected
                  ? "border-[#5100FF] shadow-[0_0_30px_rgba(81,0,255,0.25)]"
                  : ""
                }
                ${plan.default ? "cursor-default" : "cursor-pointer"}
              `}
            >

              {/* Badge */}
              {plan.badge && (
                <div className="absolute top-6 right-6 bg-[#5100FF] text-white text-xs px-4 py-1 rounded-full shadow">
                  {plan.badge}
                </div>
              )}

              {/* Default Tag */}
              {plan.default && (
                <div className="absolute top-6 right-6 bg-white/10 text-slate-300 text-xs px-3 py-1 rounded-full border border-white/10">
                  Default
                </div>
              )}

              {/* Plan Name */}
              <h3 className="text-xl font-semibold text-slate-100">
                {plan.name}
              </h3>

              {/* Price */}
              <div className="mt-4">
                <span className="text-3xl font-bold text-[#A78BFA]">
                  {plan.price}
                </span>
                <p className="text-slate-400 mt-1">
                  {plan.credits} Credits
                </p>
              </div>

              {/* Description */}
              <p className="text-slate-400 mt-4 text-sm leading-relaxed">
                {plan.description}
              </p>

              {/* Features */}
              <div className="mt-6 space-y-3 text-left">
                {plan.features.map((feature, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <FaCheckCircle className="text-[#8B5CF6] text-sm" />
                    <span className="text-slate-300 text-sm">
                      {feature}
                    </span>
                  </div>
                ))}
              </div>

              {!plan.default &&
                <button
                  disabled={loadingPlan === plan.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isSelected) {
                      setSelectedPlan(plan.id)
                    } else {
                      handlePayment(plan)
                    }
                  }} className={`w-full mt-8 py-3 rounded-xl font-semibold transition ${isSelected
                    ? "bg-[#5100FF] text-white hover:opacity-90 shadow-[0_0_20px_rgba(81,0,255,0.3)]"
                    : "bg-white/5 text-slate-300 hover:bg-[#5100FF]/20 border border-white/10"
                    }`}>
                  {loadingPlan === plan.id
                    ? "Processing..."
                    : isSelected
                      ? "Proceed to Pay"
                      : "Select Plan"}

                </button>
              }
            </Motion.div>
          )
        })}
      </div>

    </div>
  )
}

export default Pricing
