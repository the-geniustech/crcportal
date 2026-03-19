import { useState } from 'react';
import { AlertTriangle, CheckCircle, Clock, TrendingUp, Search, Filter, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ContributionRecord {
  id: string;
  memberName: string;
  groupName: string;
  expectedAmount: number;
  paidAmount: number;
  dueDate: string;
  status: 'paid' | 'partial' | 'pending' | 'defaulted';
  monthsDefaulted: number;
}

interface ContributionTrackerProps {
  contributions: ContributionRecord[];
  onSendReminder: (memberId: string) => void;
  onMarkPaid: (memberId: string) => void;
}

export default function ContributionTracker({ contributions, onSendReminder, onMarkPaid }: ContributionTrackerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [groupFilter, setGroupFilter] = useState('all');

  const groups = [...new Set(contributions.map(c => c.groupName))];

  const filteredContributions = contributions.filter(c => {
    const matchesSearch = c.memberName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         c.groupName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    const matchesGroup = groupFilter === 'all' || c.groupName === groupFilter;
    return matchesSearch && matchesStatus && matchesGroup;
  });

  const defaulters = contributions.filter(c => c.status === 'defaulted');
  const totalExpected = contributions.reduce((sum, c) => sum + c.expectedAmount, 0);
  const totalPaid = contributions.reduce((sum, c) => sum + c.paidAmount, 0);
  const collectionRate = totalExpected > 0 ? (totalPaid / totalExpected) * 100 : 0;

  const getStatusBadge = (status: string, monthsDefaulted: number) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-emerald-100 text-emerald-700"><CheckCircle className="w-3 h-3 mr-1" />Paid</Badge>;
      case 'partial':
        return <Badge className="bg-blue-100 text-blue-700"><Clock className="w-3 h-3 mr-1" />Partial</Badge>;
      case 'pending':
        return <Badge className="bg-amber-100 text-amber-700"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'defaulted':
        return <Badge className="bg-red-100 text-red-700"><AlertTriangle className="w-3 h-3 mr-1" />{monthsDefaulted}mo Defaulted</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Collection Rate</p>
              <p className="text-2xl font-bold text-emerald-600">{collectionRate.toFixed(1)}%</p>
            </div>
            <TrendingUp className="w-8 h-8 text-emerald-500" />
          </div>
          <Progress value={collectionRate} className="mt-2 h-2" />
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <p className="text-sm text-gray-500">Total Expected</p>
          <p className="text-2xl font-bold text-gray-900">₦{totalExpected.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <p className="text-sm text-gray-500">Total Collected</p>
          <p className="text-2xl font-bold text-emerald-600">₦{totalPaid.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Defaulters</p>
              <p className="text-2xl font-bold text-red-600">{defaulters.length}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
        </div>
      </div>

      {/* Defaulter Alert */}
      {defaulters.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-medium text-red-800">Defaulter Alert</h4>
              <p className="text-sm text-red-600 mt-1">
                {defaulters.length} member(s) have outstanding contributions. 
                {defaulters.filter(d => d.monthsDefaulted >= 3).length > 0 && 
                  ` ${defaulters.filter(d => d.monthsDefaulted >= 3).length} have been defaulting for 3+ months.`}
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                {defaulters.slice(0, 5).map(d => (
                  <Badge key={d.id} variant="outline" className="bg-white text-red-700 border-red-300">
                    {d.memberName} ({d.monthsDefaulted}mo)
                  </Badge>
                ))}
                {defaulters.length > 5 && (
                  <Badge variant="outline" className="bg-white text-red-700 border-red-300">
                    +{defaulters.length - 5} more
                  </Badge>
                )}
              </div>
            </div>
            <Button size="sm" className="bg-red-600 hover:bg-red-700">
              Send Reminders
            </Button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="partial">Partial</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="defaulted">Defaulted</SelectItem>
            </SelectContent>
          </Select>
          <Select value={groupFilter} onValueChange={setGroupFilter}>
            <SelectTrigger className="w-full md:w-48">
              <SelectValue placeholder="Group" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Groups</SelectItem>
              {groups.map(group => (
                <SelectItem key={group} value={group}>{group}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Contribution Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Member</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Group</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Expected</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Paid</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Due Date</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredContributions.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{record.memberName}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{record.groupName}</td>
                  <td className="px-4 py-3 text-sm font-medium">₦{record.expectedAmount.toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className={record.paidAmount >= record.expectedAmount ? 'text-emerald-600' : 'text-amber-600'}>
                      ₦{record.paidAmount.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {new Date(record.dueDate).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    {getStatusBadge(record.status, record.monthsDefaulted)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {record.status !== 'paid' && (
                        <>
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="text-xs"
                            onClick={() => onSendReminder(record.id)}
                          >
                            Remind
                          </Button>
                          <Button 
                            size="sm" 
                            className="text-xs bg-emerald-600 hover:bg-emerald-700"
                            onClick={() => onMarkPaid(record.id)}
                          >
                            Mark Paid
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
